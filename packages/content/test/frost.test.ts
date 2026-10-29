import { cellAt, issueCommand, type SpawnSpec } from "@combollect/core";
import { eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, wolf } from "../src/index.ts";
import { arena, at, cast, cellPoint, must, ready } from "./helpers.ts";

const _ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Стужа (L3-02)", () => {
	test("Стужа: −15 всем в зоне, включая носителя", () => {
		const { world, e } = arena([mage(100, 100), wolf({ x: 130, y: 100 })]);
		cast(world, must(e[0]), "L3-02", at({ x: 110, y: 100 }));
		expect(eventsOf(world, "temperature", e[0]?.id)[0]?.after).toBe(-15);
		expect(eventsOf(world, "temperature", e[1]?.id)[0]?.after).toBe(-15);
	});

	test("Стужа: обмороженный теплокровный движется медленнее", () => {
		const { world, e } = arena([
			mage(100, 100),
			wolf({ x: 400, y: 100 }),
			wolf({ x: 600, y: 100 }),
		]);
		cast(world, must(e[0]), "L3-02", at({ x: 400, y: 100 }));
		const [cold, warm] = [must(e[1]), must(e[2])];
		issueCommand(world, cold, { kind: "move", to: { x: 400, y: 1000 } });
		issueCommand(world, warm, { kind: "move", to: { x: 600, y: 1000 } });
		runSeconds(world, 0.5);
		expect(cold.position.y - 100).toBeLessThan((warm.position.y - 100) * 0.95);
	});

	test("Стужа: вода и земля покрываются льдом на 90 секунд", () => {
		const { world, e } = arena([mage(100, 100)], (x) => (x >= 10 ? "water" : "ground"));
		cast(world, must(e[0]), "L3-02", at(cellPoint(10, 3)));
		expect(cellAt(world.grid, cellPoint(10, 3))?.surface).toBe("ice");
		expect(cellAt(world.grid, cellPoint(9, 3))?.surface).toBe("ice");
		runSeconds(world, 89);
		expect(cellAt(world.grid, cellPoint(10, 3))?.surface).toBe("ice");
		runSeconds(world, 2);
		expect(cellAt(world.grid, cellPoint(10, 3))?.surface).toBe("water");
		expect(cellAt(world.grid, cellPoint(9, 3))?.surface).toBe("ground");
		expect(cellAt(world.grid, cellPoint(9, 3))?.moisture).toBe("wet");
	});

	test("Стужа: ниже −30 теплокровный теряет руки и ноги", () => {
		const { world, e } = arena([mage(100, 100), wolf({ x: 400, y: 100 }, { wetness: "soaked" })]);
		const bearer = must(e[0]);
		cast(world, bearer, "L3-02", at({ x: 400, y: 100 }));
		// Мокрый остывает вдвое сильнее: −30 за одну Стужу, и ещё раз — ниже −30.
		ready(bearer, "L3-02");
		cast(world, bearer, "L3-02", at({ x: 400, y: 100 }));
		runSeconds(world, 1);
		expect(must(e[1]).state.body?.legs).toBeLessThan(100);
		expect(must(e[1]).state.body?.arms).toBeLessThan(100);
	});
});
