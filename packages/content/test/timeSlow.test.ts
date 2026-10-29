import type { SpawnSpec } from "@combollect/core";
import { eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, outOfTimeHuman, wolf } from "../src/index.ts";
import { arena, cast, must } from "./helpers.ts";

const _ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const _mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Замедление времени (L7-01)", () => {
	const chronist = (x: number, y: number) =>
		outOfTimeHuman(
			{ x, y },
			{ name: "Хронист", laws: ["L7-01"], lore: { name: "Хронос", value: 100 } },
		);

	test("Замедление времени: подготовка 1.5 с видна всем в журнале", () => {
		const { world, e } = arena([chronist(100, 100)]);
		cast(world, must(e[0]), "L7-01", { kind: "none" });
		const windup = eventsOf(world, "windupStarted", e[0]?.id)[0];
		const applied = eventsOf(world, "lawApplied", e[0]?.id)[0];
		expect(windup?.after).toBe(1.5);
		// 45 тиков подготовки = 1.5 с; первый тик подготовки — тот, в котором она началась.
		expect((applied?.tick ?? 0) - (windup?.tick ?? 0) + 1).toBe(45);
	});

	test("Замедление времени: носитель стареет на 3% максимума здоровья навсегда", () => {
		const { world, e } = arena([chronist(100, 100)]);
		cast(world, must(e[0]), "L7-01", { kind: "none" });
		expect(must(e[0]).resources.maxHealth).toBeCloseTo(97);
		runSeconds(world, 10);
		expect(must(e[0]).resources.maxHealth).toBeCloseTo(97);
	});

	test("Замедление времени: множитель ×0.25 для всех во времени на всей карте, вне времени — ×1", () => {
		const { world, e } = arena([
			chronist(100, 100),
			wolf({ x: 1200, y: 1200 }),
			outOfTimeHuman({ x: 600, y: 600 }),
		]);
		cast(world, must(e[0]), "L7-01", { kind: "none" });
		runSeconds(world, 0.1);
		expect(must(e[1]).clock.rate).toBe(0.25);
		expect(must(e[2]).clock.rate).toBe(1);
		expect(must(e[0]).clock.rate).toBe(1);
	});

	test("Замедление времени: носитель во времени замедляет и себя", () => {
		const { world, e } = arena([human({ x: 100, y: 100 }, { name: "Вор", laws: ["L7-01"] })]);
		cast(world, must(e[0]), "L7-01", { kind: "none" });
		runSeconds(world, 0.1);
		expect(must(e[0]).clock.rate).toBeCloseTo(0.25 * 0.9);
	});

	test("Замедление времени: длится 4 секунды по часам носителя и оставляет временной шрам", () => {
		const { world, e } = arena([chronist(100, 100), wolf({ x: 1200, y: 1200 })]);
		cast(world, must(e[0]), "L7-01", { kind: "none" });
		runSeconds(world, 3.9);
		expect(must(e[1]).clock.rate).toBe(0.25);
		runSeconds(world, 0.2);
		expect(must(e[1]).clock.rate).toBe(1);
		const scar = world.timeFields.find((f) => f.name === "Временной шрам");
		expect(scar?.factor).toBe(0.9);
	});
});
