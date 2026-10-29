import { cellAt, type SpawnSpec } from "@combollect/core";
import { eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, stoneGolem, tree, wolf } from "../src/index.ts";
import { arena, at, cast, cellIndex, cellPoint, count, must, ready } from "./helpers.ts";

const _ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Пламя (L3-01)", () => {
	test("Пламя: +20 всем в зоне, включая носителя", () => {
		const { world, e } = arena([mage(100, 100), wolf({ x: 130, y: 100 })]);
		cast(world, must(e[0]), "L3-01", at({ x: 110, y: 100 }));
		expect(eventsOf(world, "temperature", e[0]?.id)[0]?.after).toBe(20);
		expect(eventsOf(world, "temperature", e[1]?.id)[0]?.after).toBe(20);
	});

	test("Пламя: одно попадание обжигает, но не поджигает", () => {
		const { world, e } = arena([mage(100, 100), tree({ x: 400, y: 100 })]);
		cast(world, must(e[0]), "L3-01", at({ x: 400, y: 100 }));
		expect(count(world, "ignited", e[1]?.id)).toBe(0);
	});

	test("Пламя: два попадания подряд (+30 и выше) поджигают горючее, оно сгорает и исчезает", () => {
		const { world, e } = arena([mage(100, 100), tree({ x: 400, y: 100 })]);
		const bearer = must(e[0]);
		for (let i = 0; i < 2; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at({ x: 400, y: 100 }));
		}
		expect(count(world, "ignited", e[1]?.id)).toBe(1);
		runSeconds(world, 20);
		expect(world.entities.has(must(e[1]).id)).toBe(false);
		expect(count(world, "death", e[1]?.id)).toBe(1);
	});

	test("Пламя: негорючий голем нагревается, но не горит", () => {
		const { world, e } = arena([mage(100, 100), stoneGolem({ x: 400, y: 100 })]);
		const bearer = must(e[0]);
		for (let i = 0; i < 3; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at({ x: 400, y: 100 }));
		}
		expect(must(e[1]).state.temperature).toBeGreaterThan(30);
		expect(count(world, "ignited", e[1]?.id)).toBe(0);
	});

	test("Пламя: горящее дерево поджигает соседнее", () => {
		const { world, e } = arena([
			mage(100, 100),
			tree({ x: 400, y: 100 }),
			tree({ x: 450, y: 100 }),
		]);
		const bearer = must(e[0]);
		for (let i = 0; i < 3; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at({ x: 380, y: 100 }));
		}
		expect(count(world, "ignited", e[1]?.id)).toBe(1);
		expect(count(world, "ignited", e[2]?.id)).toBe(0);
		runSeconds(world, 10);
		expect(count(world, "ignited", e[2]?.id)).toBe(1);
	});

	test("Пламя: трава горит и становится выжженной землёй, которая не загорается снова", () => {
		const { world, e } = arena([mage(100, 100)], (x) => (x >= 10 ? "grass" : "ground"));
		const bearer = must(e[0]);
		const target = cellPoint(15, 3);
		for (let i = 0; i < 3; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at(target));
		}
		expect(count(world, "cellIgnited")).toBeGreaterThan(0);
		runSeconds(world, 6);
		expect(cellAt(world.grid, target)?.surface).toBe("scorched");
		const ignitions = count(world, "cellIgnited", undefined);
		for (let i = 0; i < 3; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at(target));
		}
		const scorchedIndex = cellIndex(world, 15, 3);
		const reignited = eventsOf(world, "cellIgnited").filter((ev) => ev.cell === scorchedIndex);
		expect(reignited).toHaveLength(1);
		expect(count(world, "cellIgnited")).toBeGreaterThanOrEqual(ignitions);
	});

	test("Пламя: выжженная земля горячая и греет стоящего", () => {
		const { world, e } = arena([stoneGolem({ x: 48, y: 48 })], () => "ground");
		const index = cellIndex(world, 1, 1);
		const cell = must(world.grid.cells[index]);
		cell.surface = "scorched";
		cell.trace = { kind: "scorched", remainingSec: 120 };
		runSeconds(world, 1);
		// Голем не теплокровный: остывает на 1°/с, греется на 2°/с.
		expect(must(e[0]).state.temperature).toBeCloseTo(1, 1);
	});
});
