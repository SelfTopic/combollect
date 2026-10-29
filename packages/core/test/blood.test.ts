import { describe, expect, test } from "vitest";
import { damage, damageZone, wound } from "../src/api/deliver.ts";
import { addTimeField } from "../src/clock.ts";
import type { Entity } from "../src/entity.ts";
import { cellIndexAt } from "../src/grid.ts";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds } from "../src/testing.ts";
import type { World } from "../src/world.ts";
import { IN_TIME, person, testLaws } from "./helpers.ts";

const CUT = { healthPer100Units: 2, healthPerSecStanding: 0.5, trailSec: 60 };
const BLOODY = ["Material", "Living", "Limbs", "Blood", "Mass:Medium", "InTime"] as const;

function one(extra: Parameters<typeof person>[2] = {}) {
	const { world, entities } = createTestWorld({
		laws: testLaws,
		entities: [person("Раненый", { x: 100, y: 100 }, { tags: BLOODY, ...extra })],
	});
	const [a] = entities;
	if (a === undefined) throw new Error();
	return { world, a };
}

function bloodCells(world: World): number[] {
	return world.grid.cells.flatMap((c, i) => (c.blood !== null ? [i] : []));
}

function walkRight(world: World, a: Entity, units: number): void {
	issueCommand(world, a, { kind: "move", to: { x: a.position.x + units, y: a.position.y } });
}

describe("Кровопотеря", () => {
	test("Кровопотеря: рана открывается только у того, у кого есть кровь", () => {
		const bloody = one();
		wound(bloody.world, bloody.a, CUT, {});
		expect(bloody.a.state.wounds).toHaveLength(1);
		const dry = one({ tags: ["Material", "Limbs", "InTime"] });
		wound(dry.world, dry.a, CUT, {});
		expect(dry.a.state.wounds).toHaveLength(0);
	});

	test("Кровопотеря: каждая рана — стак, стоя теряешь 0.5 здоровья в секунду за стак", () => {
		const { world, a } = one();
		wound(world, a, CUT, {});
		wound(world, a, CUT, {});
		runSeconds(world, 2);
		expect(a.resources.health).toBeCloseTo(100 - 2 * 0.5 * 2, 5);
	});

	test("Кровопотеря: на ходу теряешь 2 здоровья за каждые 100 единиц пути", () => {
		const { world, a } = one();
		wound(world, a, CUT, {});
		walkRight(world, a, 300);
		runSeconds(world, 1);
		expect(a.position.x).toBeCloseTo(400, 3);
		expect(a.resources.health).toBeCloseTo(100 - 6, 1);
	});

	test("Кровопотеря: раненый оставляет кровавый след по пути с направлением", () => {
		const { world, a } = one();
		wound(world, a, CUT, {});
		walkRight(world, a, 300);
		runSeconds(world, 1);
		const trail = bloodCells(world);
		expect(trail.length).toBeGreaterThanOrEqual(9);
		const last = world.grid.cells[cellIndexAt(world.grid, a.position) ?? -1];
		expect(last?.blood?.heading.x).toBeCloseTo(1);
	});

	test("Кровопотеря: след держится 60 с по часам клетки и исчезает", () => {
		const { world, a } = one();
		wound(world, a, CUT, {});
		walkRight(world, a, 64);
		runSeconds(world, 0.5);
		a.state.wounds.splice(0);
		runSeconds(world, 59);
		expect(bloodCells(world).length).toBeGreaterThan(0);
		runSeconds(world, 1.5);
		expect(bloodCells(world)).toEqual([]);
	});

	test("Кровопотеря: в остановленном времени кровь не течёт, а рана ждёт возобновления", () => {
		const { world, a } = one();
		const stop = { factor: 0, durationSec: 100, requires: IN_TIME, excludes: {}, name: "Стоп" };
		addTimeField(world, a.id, stop, {});
		runSeconds(world, 0.1);
		wound(world, a, CUT, {});
		expect(a.state.wounds).toHaveLength(0);
		expect(eventsOf(world, "hitStored", a.id)).toHaveLength(1);
		runSeconds(world, 3);
		expect(a.resources.health).toBe(100);
	});

	test("Кровопотеря: накопленная в остановке рана открывается в момент возобновления", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Раненый", { x: 100, y: 100 }, { tags: BLOODY }),
				person("Хранитель", { x: 500, y: 500 }, { outOfTime: true }),
			],
		});
		const [a, keeper] = entities;
		if (a === undefined || keeper === undefined) throw new Error();
		addTimeField(
			world,
			keeper.id,
			{ factor: 0, durationSec: 1, requires: IN_TIME, excludes: {}, name: "Стоп" },
			{},
		);
		runSeconds(world, 0.1);
		wound(world, a, CUT, {});
		runSeconds(world, 1.5);
		expect(a.state.wounds).toHaveLength(1);
	});
});

describe("Регенерация и хрупкость", () => {
	test("Регенерация: регенерирующий восстанавливает зоны тела и здоровье", () => {
		const { world, a } = one({ tags: [...BLOODY, "Regenerating"] });
		damageZone(world, a, "legs", 50, {});
		damage(world, a, 50, {});
		runSeconds(world, 10);
		expect(a.state.body?.legs).toBeCloseTo(60, 3);
		expect(a.resources.health).toBeCloseTo(60, 3);
	});

	test("Регенерация: нерегенерирующее тело само не восстанавливается", () => {
		const { world, a } = one();
		damageZone(world, a, "legs", 50, {});
		damage(world, a, 50, {});
		runSeconds(world, 10);
		expect(a.state.body?.legs).toBe(50);
		expect(a.resources.health).toBe(50);
	});

	test("Регенерация: рана регенерирующего затягивается за 10 секунд его времени", () => {
		const { world, a } = one({ tags: [...BLOODY, "Regenerating"] });
		wound(world, a, CUT, {});
		wound(world, a, CUT, {});
		runSeconds(world, 9.9);
		expect(a.state.wounds).toHaveLength(2);
		runSeconds(world, 0.2);
		expect(a.state.wounds).toHaveLength(1);
	});

	test("Хрупкость: хрупкое тело теряет целостность зон на 30% быстрее", () => {
		const { world, a } = one({ fragility: 1.3 });
		damageZone(world, a, "arms", 40, {});
		expect(a.state.body?.arms).toBeCloseTo(48);
	});

	test("Хрупкость: торс — тоже зона, урон здоровью хрупкому на 30% больше", () => {
		const { world, a } = one({ fragility: 1.3 });
		damage(world, a, 10, {});
		expect(a.resources.health).toBeCloseTo(87);
	});
});

describe("Лорный ресурс", () => {
	test("Ресурс: пока носитель стоит, восстанавливается по своей скорости стоя", () => {
		const lore = { name: "Хронос", value: 10, regenPerSec: 1, standingRegenPerSec: 4 };
		const { world, a } = one({ lore });
		if (a.resources.lore !== null) a.resources.lore.max = 100;
		runSeconds(world, 2);
		expect(a.resources.lore?.value).toBeCloseTo(18, 1);
	});

	test("Ресурс: на ходу восстанавливается по обычной скорости", () => {
		const lore = { name: "Хронос", value: 10, regenPerSec: 1, standingRegenPerSec: 4 };
		const { world, a } = one({ lore });
		if (a.resources.lore !== null) a.resources.lore.max = 100;
		walkRight(world, a, 2000);
		runSeconds(world, 2);
		// Первый тик он ещё стоял: шаг начинается после восстановления ресурса.
		expect(a.resources.lore?.value).toBeCloseTo(12, 0);
	});
});
