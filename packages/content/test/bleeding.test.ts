import { issueCommand } from "@combollect/core";
import { runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, outOfTimeHuman, stoneGolem, tree } from "../src/index.ts";
import { arena, cast, must, on, ready } from "./helpers.ts";

const cutter = (x: number, y: number) =>
	outOfTimeHuman({ x, y }, { name: "Тень", laws: ["L1-02"] });

describe("Кровотечение (L1-02)", () => {
	test("Кровотечение: открывает рану у того, у кого есть кровь", () => {
		const { world, e } = arena([cutter(100, 100), human({ x: 140, y: 100 })]);
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		expect(must(e[1]).state.wounds).toHaveLength(1);
	});

	test("Кровотечение: каждый удар — ещё один стак", () => {
		const { world, e } = arena([cutter(100, 100), human({ x: 140, y: 100 })]);
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		ready(must(e[0]), "L1-02");
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		expect(must(e[1]).state.wounds).toHaveLength(2);
	});

	test("Кровотечение: у голема нет крови — не действует", () => {
		const { world, e } = arena([cutter(100, 100), stoneGolem({ x: 148, y: 100 })]);
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		expect(must(e[1]).state.wounds).toHaveLength(0);
	});

	test("Кровотечение: дерево живое, но крови у него нет — не действует", () => {
		const { world, e } = arena([cutter(100, 100), tree({ x: 150, y: 100 })]);
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		expect(must(e[1]).state.wounds).toHaveLength(0);
	});

	test("Кровотечение: бегущий теряет больше, чем стоящий", () => {
		const { world, e } = arena([
			cutter(100, 100),
			human({ x: 140, y: 100 }, { name: "Бегун" }),
			human({ x: 100, y: 140 }, { name: "Стоящий" }),
		]);
		const [shadow, runner, stander] = [must(e[0]), must(e[1]), must(e[2])];
		cast(world, shadow, "L1-02", on(runner));
		ready(shadow, "L1-02");
		cast(world, shadow, "L1-02", on(stander));
		issueCommand(world, runner, { kind: "move", to: { x: 1200, y: 100 } });
		const [r0, s0] = [runner.resources.health, stander.resources.health];
		runSeconds(world, 2);
		expect(r0 - runner.resources.health).toBeCloseTo(12, 0);
		expect(s0 - stander.resources.health).toBeCloseTo(1, 1);
	});

	test("Кровотечение: оставляет кровавый след по пути раненого", () => {
		const { world, e } = arena([cutter(100, 100), human({ x: 140, y: 100 })]);
		cast(world, must(e[0]), "L1-02", on(must(e[1])));
		issueCommand(world, must(e[1]), { kind: "move", to: { x: 600, y: 100 } });
		runSeconds(world, 2);
		const trail = world.grid.cells.filter((c) => c.blood !== null);
		expect(trail.length).toBeGreaterThanOrEqual(14);
	});

	test("Кровотечение: режет и носителя, если тот ударит себя", () => {
		const { world, e } = arena([cutter(100, 100)]);
		cast(world, must(e[0]), "L1-02", on(must(e[0])));
		expect(must(e[0]).state.wounds).toHaveLength(1);
	});
});
