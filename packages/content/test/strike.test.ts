import type { SpawnSpec } from "@combollect/core";
import { describe, expect, test } from "vitest";
import { human } from "../src/index.ts";
import { arena, cast, must, on } from "./helpers.ts";

const ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const mage = (x: number, y: number) => human({ x, y }, { name: "Носитель" });

describe("Удар (базовая атака)", () => {
	test("Удар: бьёт материальное, в том числе союзника", () => {
		const { world, e } = arena([mage(100, 100), human({ x: 140, y: 100 }, { name: "Союзник" })]);
		cast(world, must(e[0]), "L2-00", on(must(e[1])));
		expect(e[1]?.resources.health).toBe(90);
	});

	test("Удар: проходит сквозь бесплотного", () => {
		const { world, e } = arena([mage(100, 100), ghost(140, 100)]);
		cast(world, must(e[0]), "L2-00", on(must(e[1])));
		expect(e[1]?.resources.health).toBe(50);
	});
});
