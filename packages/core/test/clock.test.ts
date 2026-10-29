import { describe, expect, test } from "vitest";
import { addTimeField } from "../src/clock.ts";
import { spawn } from "../src/spawn.ts";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds, runTicks } from "../src/testing.ts";
import type { World } from "../src/world.ts";
import { IN_TIME, person, testLaws } from "./helpers.ts";

function field(world: World, bearerId: number, factor: number, durationSec: number) {
	return addTimeField(
		world,
		bearerId,
		{ factor, durationSec, requires: IN_TIME, excludes: {}, name: `поле ×${factor}` },
		{},
	);
}

describe("Часы", () => {
	test("без полей время у всех идёт как обычно", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [person("А", { x: 50, y: 50 })],
		});
		runTicks(world, 1);
		expect(entities[0]?.clock.rate).toBe(1);
	});

	test("множители полей перемножаются: ×0.25 и ×0.5 дают ×0.125", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Носитель", { x: 50, y: 50 }, { outOfTime: true }),
				person("Цель", { x: 200, y: 50 }),
			],
		});
		const [bearer, target] = entities;
		if (bearer === undefined || target === undefined) throw new Error();
		field(world, bearer.id, 0.25, 10);
		field(world, bearer.id, 0.5, 10);
		runTicks(world, 1);
		expect(target.clock.rate).toBeCloseTo(0.125);
	});

	test("сущность вне времени не замечает чужого поля", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Носитель", { x: 50, y: 50 }),
				person("Тень", { x: 200, y: 50 }, { outOfTime: true }),
			],
		});
		const [bearer, shadow] = entities;
		if (bearer === undefined || shadow === undefined) throw new Error();
		field(world, bearer.id, 0.25, 10);
		runTicks(world, 1);
		expect(shadow.clock.rate).toBe(1);
	});

	test("длительность поля идёт в часах носителя: замедленный носитель держит поле дольше", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Во времени", { x: 50, y: 50 }),
				person("Вне времени", { x: 200, y: 50 }, { outOfTime: true }),
			],
		});
		const [slowBearer, other] = entities;
		if (slowBearer === undefined || other === undefined) throw new Error();
		// Поле ×0.5 у носителя во времени; его самого замедляет чужое поле ×0.25 на всё время теста.
		field(world, slowBearer.id, 0.5, 1);
		field(world, other.id, 0.25, 100);
		runSeconds(world, 3.9);
		expect(world.timeFields.some((f) => f.factor === 0.5)).toBe(true);
		runSeconds(world, 0.2);
		expect(world.timeFields.some((f) => f.factor === 0.5)).toBe(false);
	});

	test("поле не замедляет отсчёт самого себя у своего носителя во времени", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [person("Носитель", { x: 50, y: 50 })],
		});
		const bearer = entities[0];
		if (bearer === undefined) throw new Error();
		field(world, bearer.id, 0, 1);
		runSeconds(world, 0.5);
		expect(bearer.clock.rate).toBe(0);
		runSeconds(world, 0.6);
		expect(bearer.clock.rate).toBe(1);
	});
});

describe("Остановка времени (поле ×0) на уровне ядра", () => {
	function stoppedWorld() {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Тень", { x: 100, y: 100 }, { outOfTime: true }),
				person("Враг", { x: 140, y: 100 }),
			],
		});
		const [shadow, enemy] = entities;
		if (shadow === undefined || enemy === undefined) throw new Error();
		field(world, shadow.id, 0, 2);
		runTicks(world, 1);
		return { world, shadow, enemy };
	}

	test("сущность во времени стоит, сущность вне времени ходит", () => {
		const { world, shadow, enemy } = stoppedWorld();
		issueCommand(world, enemy, { kind: "move", to: { x: 400, y: 100 } });
		issueCommand(world, shadow, { kind: "move", to: { x: 100, y: 400 } });
		runSeconds(world, 1);
		expect(enemy.position).toEqual({ x: 140, y: 100 });
		expect(shadow.position.y).toBeGreaterThan(300);
	});

	test("снаряд во времени застывает и летит после возобновления", () => {
		const { world, shadow } = stoppedWorld();
		const knife = spawn(world, {
			name: "Нож",
			tags: ["Material", "Projectile", "InTime", "Mass:Light"],
			position: { x: 100, y: 300 },
			velocity: { x: 300, y: 0 },
			health: 1,
			radiusUnits: 4,
			projectile: { lawId: "T", ownerId: shadow.id, remainingRange: 1000, damage: 5 },
		});
		runSeconds(world, 1);
		expect(knife.position).toEqual({ x: 100, y: 300 });
		runSeconds(world, 2);
		expect(knife.position.x).toBeGreaterThan(300);
	});

	test("удар по остановленной сущности копится и применяется в момент возобновления", () => {
		const { world, shadow, enemy } = stoppedWorld();
		issueCommand(world, shadow, { kind: "attack", targetId: enemy.id });
		runSeconds(world, 0.2);
		expect(enemy.resources.health).toBe(100);
		expect(enemy.state.pending).toHaveLength(1);
		expect(eventsOf(world, "hitStored", enemy.id)).toHaveLength(1);
		runSeconds(world, 2);
		expect(enemy.resources.health).toBe(90);
		expect(eventsOf(world, "hitsReleased", enemy.id)).toHaveLength(1);
	});

	test("несколько ударов по остановленной сущности применяются разом, в один тик", () => {
		const { world, shadow, enemy } = stoppedWorld();
		shadow.laws[0] = {
			lawId: "T-STRIKE",
			cooldownSec: 0,
			params: { rangeUnits: 40, damage: 10, cooldownSec: 0 },
		};
		for (let i = 0; i < 3; i++)
			issueCommand(world, shadow, { kind: "attack", targetId: enemy.id }, { queue: true });
		runSeconds(world, 1.5);
		expect(enemy.state.pending).toHaveLength(3);
		runSeconds(world, 1);
		const hits = eventsOf(world, "health", enemy.id);
		expect(hits).toHaveLength(3);
		expect(new Set(hits.map((e) => e.tick)).size).toBe(1);
		expect(enemy.resources.health).toBe(70);
	});

	test("толчок по остановленной сущности тоже копится и срабатывает при возобновлении", () => {
		const { world, shadow, enemy } = stoppedWorld();
		issueCommand(world, shadow, {
			kind: "useLaw",
			slot: 1,
			target: { kind: "entity", id: enemy.id },
		});
		runSeconds(world, 1);
		expect(enemy.position).toEqual({ x: 140, y: 100 });
		runSeconds(world, 2);
		expect(enemy.position.x).toBeGreaterThan(200);
	});

	test("перезарядка носителя во времени не идёт, пока время стоит", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Хронист", { x: 50, y: 50 }, { outOfTime: true }),
				person("Боец", { x: 100, y: 50 }),
			],
		});
		const [chronist, fighter] = entities;
		if (chronist === undefined || fighter === undefined) throw new Error();
		issueCommand(world, fighter, { kind: "attack", targetId: chronist.id });
		runTicks(world, 1);
		const slot = fighter.laws[0];
		const before = slot?.cooldownSec ?? 0;
		expect(before).toBeGreaterThan(1.9);
		field(world, chronist.id, 0, 1);
		runSeconds(world, 1);
		expect(slot?.cooldownSec).toBe(before);
		runSeconds(world, 1);
		expect(slot?.cooldownSec).toBeLessThan(before - 0.9);
	});
});
