import type { SpawnSpec } from "@combollect/core";
import { describe, expect, test } from "vitest";
import { human, rock, stoneGolem } from "../src/index.ts";
import { arena, cast, count, must, on, ready } from "./helpers.ts";

const ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Limbs", "Mind", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});
const butcher = (x: number, y: number) => human({ x, y }, { name: "Мясник", laws: ["L1-01"] });

describe("Перелом (L1-01)", () => {
	test("Перелом: удар в нижнюю половину тела ломает ноги на 40%", () => {
		const { world, e } = arena([butcher(100, 100), human({ x: 140, y: 100 })]);
		const target = must(e[1]);
		cast(world, must(e[0]), "L1-01", { kind: "entity", id: target.id, aim: { x: 140, y: 110 } });
		expect(target.state.body?.legs).toBe(60);
		expect(target.state.body?.arms).toBe(100);
	});

	test("Перелом: удар в верхнюю половину тела ломает руки на 40%", () => {
		const { world, e } = arena([butcher(100, 100), human({ x: 140, y: 100 })]);
		const target = must(e[1]);
		cast(world, must(e[0]), "L1-01", { kind: "entity", id: target.id, aim: { x: 140, y: 90 } });
		expect(target.state.body?.arms).toBe(60);
		expect(target.state.body?.legs).toBe(100);
	});

	test("Перелом: здоровье не трогает — это кость, а не рана", () => {
		const { world, e } = arena([butcher(100, 100), human({ x: 140, y: 100 })]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(must(e[1]).resources.health).toBe(100);
	});

	test("Перелом: замах 0.3 с виден в журнале", () => {
		const { world, e } = arena([butcher(100, 100), human({ x: 140, y: 100 })]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(count(world, "windupStarted", e[0]?.id)).toBe(1);
	});

	test("Перелом: ломает конечности и голему — у него тоже есть конечности", () => {
		const { world, e } = arena([butcher(100, 100), stoneGolem({ x: 148, y: 100 })]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(must(e[1]).state.body?.legs).toBe(60);
	});

	test("Перелом: бесплотному ломать нечего", () => {
		const { world, e } = arena([butcher(100, 100), ghost(140, 100)]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(must(e[1]).state.body?.legs).toBe(100);
	});

	test("Перелом: у камня нет конечностей — не действует", () => {
		const { world, e } = arena([butcher(100, 100), rock({ x: 148, y: 100 })]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(must(e[1]).resources.health).toBe(10000);
		expect(count(world, "bodyZone", e[1]?.id)).toBe(0);
	});

	test("Перелом: ломает и союзнику", () => {
		const ally = human({ x: 140, y: 100 }, { name: "Союзник" });
		const { world, e } = arena([butcher(100, 100), ally]);
		cast(world, must(e[0]), "L1-01", on(must(e[1])));
		expect(must(e[1]).state.body?.legs).toBe(60);
	});

	test("Перелом: три удара по ногам — ноги сломаны", () => {
		const { world, e } = arena([butcher(100, 100), human({ x: 140, y: 100 })]);
		const target = must(e[1]);
		for (let i = 0; i < 3; i++) {
			ready(must(e[0]), "L1-01");
			cast(world, must(e[0]), "L1-01", on(target));
		}
		expect(target.state.body?.legs).toBe(0);
	});
});
