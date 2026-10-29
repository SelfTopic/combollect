import { eventsOf } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { scenarios } from "../scenarios/index.ts";
import { knifeWall } from "../scenarios/knife-wall.ts";
import { puddleLightning } from "../scenarios/puddle-lightning.ts";
import { JournalPrinter } from "../src/format.ts";
import { runScenario } from "../src/scenario.ts";

function journal(scenarioId: string, seed?: number): string {
	const scenario = scenarios.find((s) => s.id === scenarioId);
	if (scenario === undefined) throw new Error(scenarioId);
	return JSON.stringify(runScenario(scenario, seed).setup.world.events.entries);
}

describe("Детерминизм", () => {
	for (const scenario of scenarios) {
		test(`Детерминизм: «${scenario.title}» дважды с одним сидом даёт одинаковый журнал`, () => {
			expect(journal(scenario.id)).toBe(journal(scenario.id));
		});
	}

	test("Детерминизм: другой сид — другая расстановка волков в луже и другой журнал", () => {
		expect(journal("puddle-lightning", 1)).not.toBe(journal("puddle-lightning", 2));
	});
});

describe("Сценарий «Стена ножей»", () => {
	const run = runScenario(knifeWall);
	const { world } = run.setup;
	const knives = eventsOf(world, "entitySpawned").filter((e) => e.note === "Нож");

	test("Стена ножей: каждый нож, брошенный в остановке, застывает, едва покинув руку", () => {
		expect(knives.length).toBeGreaterThanOrEqual(9);
		expect(knives.every((k) => k.after === 0)).toBe(true);
	});

	test("Стена ножей: все застывшие ножи снова пошли в один и тот же тик", () => {
		const resumed = eventsOf(world, "clockRate").filter(
			(e) => e.after === 1 && knives.some((k) => k.target === e.target),
		);
		expect(resumed).toHaveLength(knives.length);
		expect(new Set(resumed.map((e) => e.tick)).size).toBe(1);
	});

	test("Стена ножей: журнал печатается по-русски и показывает застывание ножей", () => {
		const lines = new JournalPrinter(world).print(run.notes);
		expect(lines.some((l) => l.includes("застывает в воздухе"))).toBe(true);
		expect(lines.some((l) => l.includes("⧗ Часы ×1") && l.includes("Нож"))).toBe(true);
	});
});

describe("Сценарий «Лужа и молния»", () => {
	test("Лужа и молния: первый разряд бьёт всех в луже, второй — по льду — никого", () => {
		const { world, actors } = runScenario(puddleLightning).setup;
		const struck = eventsOf(world, "health").filter((e) => e.cause.lawId === "L4-01");
		const ticks = [...new Set(struck.map((e) => e.tick))];
		expect(ticks).toHaveLength(1);
		expect(struck.map((e) => e.target)).toContain(actors.ally?.id);
		expect(struck.map((e) => e.target)).not.toContain(actors.dryWolf?.id);
		expect(struck.map((e) => e.target)).not.toContain(actors.mage?.id);
	});
});
