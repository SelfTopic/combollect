// Законы времени и часы сущностей (docs/06-time-system.md) на настоящих законах этапа 1.

import { addTimeField, type Entity, issueCommand, type World } from "@combollect/core";
import { eventsOf, runSeconds, runTicks } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, outOfTimeHuman, tree, wolf } from "../src/index.ts";
import { arena, at, cast, count, must, on, ready } from "./helpers.ts";

const chronist = (x: number, y: number) =>
	outOfTimeHuman(
		{ x, y },
		{ name: "Хронист", laws: ["L7-01"], lore: { name: "Хронос", value: 100 } },
	);

/** Хронист далеко в углу применяет замедление; остальное — в поле карты. */
function slowed(others: Parameters<typeof arena>[0]): { world: World; e: Entity[] } {
	const result = arena([chronist(1200, 1200), ...others]);
	cast(result.world, must(result.e[0]), "L7-01", { kind: "none" });
	runTicks(result.world, 1);
	return result;
}

describe("Замедление времени ×0.25", () => {
	test("Замедление времени: снаряд во времени летит в 4 раза медленнее", () => {
		const { world, e } = slowed([
			outOfTimeHuman({ x: 100, y: 100 }, { name: "Тень", laws: ["L2-02"] }),
		]);
		cast(world, must(e[1]), "L2-02", at({ x: 900, y: 100 }));
		const knife = [...world.entities.values()].find((x) => x.name === "Нож");
		const start = must(knife).position.x;
		runSeconds(world, 1);
		expect(must(knife).position.x - start).toBeCloseTo(600 * 0.25, 0);
	});

	test("Замедление времени: движение во времени — ×0.25, вне времени — как обычно", () => {
		const { world, e } = slowed([human({ x: 100, y: 100 }), outOfTimeHuman({ x: 100, y: 300 })]);
		const [inTime, outOfTime] = [must(e[1]), must(e[2])];
		issueCommand(world, inTime, { kind: "move", to: { x: 1000, y: 100 } });
		issueCommand(world, outOfTime, { kind: "move", to: { x: 1000, y: 300 } });
		runSeconds(world, 1);
		expect(inTime.position.x - 100).toBeCloseTo(300 * 0.25, 0);
		expect(outOfTime.position.x - 100).toBeCloseTo(300, 0);
	});

	test("Замедление времени: перезарядка во времени идёт в 4 раза медленнее, вне времени — как обычно", () => {
		const { world, e } = slowed([
			human({ x: 100, y: 100 }, { laws: ["L3-01"], lore: { name: "Запас", value: 1000 } }),
			outOfTimeHuman({ x: 100, y: 300 }, { laws: ["L3-01"], lore: { name: "Запас", value: 1000 } }),
		]);
		const [inTime, outOfTime] = [must(e[1]), must(e[2])];
		cast(world, inTime, "L3-01", at({ x: 500, y: 500 }));
		cast(world, outOfTime, "L3-01", at({ x: 500, y: 500 }));
		const inSlot = must(inTime.laws[1]);
		const outSlot = must(outOfTime.laws[1]);
		const [inBefore, outBefore] = [inSlot.cooldownSec, outSlot.cooldownSec];
		runSeconds(world, 1);
		expect(inBefore - inSlot.cooldownSec).toBeCloseTo(0.25, 2);
		expect(outBefore - outSlot.cooldownSec).toBeCloseTo(1, 2);
	});

	test("Замедление времени: подготовка закона во времени идёт в 4 раза медленнее", () => {
		const { world, e } = slowed([
			human({ x: 100, y: 100 }, { laws: ["L3-01"], lore: { name: "Запас", value: 1000 } }),
		]);
		const mage = must(e[1]);
		issueCommand(world, mage, { kind: "useLaw", slot: 1, target: at({ x: 300, y: 300 }) });
		runSeconds(world, 1);
		expect(count(world, "lawApplied", mage.id)).toBe(0);
		runSeconds(world, 0.3);
		expect(count(world, "lawApplied", mage.id)).toBe(1);
	});

	test("Замедление времени + Горение: огонь жжёт дерево в 4 раза медленнее", () => {
		const burnLoss = (slow: boolean): number => {
			const { world, e } = arena([
				chronist(1200, 1200),
				tree({ x: 400, y: 400 }, { temperature: 40 }),
			]);
			if (slow) cast(world, must(e[0]), "L7-01", { kind: "none" });
			runTicks(world, 2);
			const before = must(e[1]).resources.health;
			runSeconds(world, 2);
			return before - must(e[1]).resources.health;
		};
		expect(burnLoss(true) / burnLoss(false)).toBeCloseTo(0.25, 2);
	});

	test("Замедление времени + Горение: огонь распространяется медленнее", () => {
		const spreadTime = (slow: boolean): number => {
			const { world, e } = arena([
				chronist(1200, 1200),
				tree({ x: 400, y: 400 }, { temperature: 40 }),
				tree({ x: 450, y: 400 }),
			]);
			const start = world.tick;
			if (slow) cast(world, must(e[0]), "L7-01", { kind: "none" });
			runSeconds(world, 40);
			return (eventsOf(world, "ignited", e[2]?.id)[0]?.tick ?? Number.POSITIVE_INFINITY) - start;
		};
		const fast = spreadTime(false);
		expect(fast).toBeLessThan(30 * 10);
		// Замедление длится 4 с своего времени: за это время огонь почти стоит, и поджог запаздывает.
		expect(spreadTime(true)).toBeGreaterThan(fast + 30 * 2);
	});
});

describe("Остановка времени (поле ×0) с законами этапа 1", () => {
	function stopped(others: Parameters<typeof arena>[0]) {
		const result = arena([
			outOfTimeHuman({ x: 100, y: 100 }, { name: "Тень", laws: ["L2-02"] }),
			...others,
		]);
		const shadow = must(result.e[0]);
		addTimeField(
			result.world,
			shadow.id,
			{
				factor: 0,
				durationSec: 2,
				requires: { all: ["InTime"] },
				excludes: { any: ["OutOfTime"] },
				name: "Остановка",
			},
			{},
		);
		runTicks(result.world, 1);
		return { ...result, shadow };
	}

	test("Остановка: снаряд застывает, едва покинув руку носителя вне времени", () => {
		const { world, shadow } = stopped([wolf({ x: 500, y: 100 })]);
		cast(world, shadow, "L2-02", at({ x: 500, y: 100 }));
		const knife = must([...world.entities.values()].find((x) => x.name === "Нож"));
		const thrownAt = knife.position;
		expect(thrownAt.x - shadow.position.x).toBeGreaterThan(shadow.stats.radiusUnits);
		expect(knife.clock.rate).toBe(0);
		runSeconds(world, 1);
		expect(knife.position).toEqual(thrownAt);
	});

	test("Остановка: застывшие ножи после возобновления летят одновременно и попадают", () => {
		const { world, shadow, e } = stopped([wolf({ x: 500, y: 100 })]);
		must(shadow.laws[1]).params.cooldownSec = 0.2;
		for (let i = 0; i < 3; i++) {
			ready(shadow, "L2-02");
			cast(world, shadow, "L2-02", at({ x: 500, y: 100 }));
		}
		const knives = [...world.entities.values()].filter((x) => x.name === "Нож");
		expect(knives).toHaveLength(3);
		runSeconds(world, 2.5);
		expect(must(e[1]).resources.health).toBe(0);
		const hitTicks = eventsOf(world, "projectileHit", e[1]?.id).map((ev) => ev.tick);
		expect(hitTicks).toHaveLength(3);
		// Все три ножа висели в одной точке у руки и полетели в один тик.
		expect(new Set(hitTicks).size).toBe(1);
	});

	test("Остановка: удар по остановленному копится и применяется при возобновлении", () => {
		const { world, shadow, e } = stopped([wolf({ x: 140, y: 100 })]);
		const wolfEntity = must(e[1]);
		cast(world, shadow, "L2-00", on(wolfEntity));
		expect(wolfEntity.resources.health).toBe(60);
		expect(count(world, "hitStored", wolfEntity.id)).toBe(1);
		runSeconds(world, 2);
		expect(wolfEntity.resources.health).toBe(50);
	});

	test("Остановка: огонь в остановленном времени не греет тех, кто во времени", () => {
		const { world, e } = stopped([
			tree({ x: 400, y: 400 }, { temperature: 40 }),
			tree({ x: 450, y: 400 }),
		]);
		runSeconds(world, 1.5);
		expect(must(e[2]).state.temperature).toBe(0);
		expect(must(e[1]).resources.health).toBe(60);
	});

	test("Остановка: тот, кто вне времени, обжигается о горящее в остановке", () => {
		const { world, shadow, e } = stopped([tree({ x: 150, y: 100 }, { temperature: 40 })]);
		runSeconds(world, 1.5);
		expect(shadow.state.temperature).toBeGreaterThan(0);
		expect(must(e[1]).resources.health).toBe(60);
	});
});
