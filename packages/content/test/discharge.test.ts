import type { SpawnSpec } from "@combollect/core";
import { describe, expect, test } from "vitest";
import { human, wolf } from "../src/index.ts";
import { arena, at, cast, must, ready } from "./helpers.ts";

const _ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Разряд (L4-01)", () => {
	test("Разряд: бьёт мокрого (проводник) уроном и сотрясением, сухого — нет", () => {
		const { world, e } = arena([
			mage(100, 100),
			wolf({ x: 400, y: 100 }, { wetness: "wet" }),
			wolf({ x: 400, y: 400 }),
		]);
		const bearer = must(e[0]);
		cast(world, bearer, "L4-01", at({ x: 400, y: 100 }));
		expect(must(e[1]).resources.health).toBe(35);
		expect(must(e[1]).state.body?.head).toBe(80);
		ready(bearer, "L4-01");
		cast(world, bearer, "L4-01", at({ x: 400, y: 400 }));
		expect(must(e[2]).resources.health).toBe(60);
	});

	test("Разряд: ток по цепи проводников бьёт и носителя", () => {
		const { world, e } = arena([
			human({ x: 100, y: 100 }, { name: "Мокрый носитель", laws: ["L4-01"], wetness: "wet" }),
			wolf({ x: 220, y: 100 }, { wetness: "wet" }),
			wolf({ x: 340, y: 100 }, { wetness: "wet" }),
		]);
		cast(world, must(e[0]), "L4-01", at({ x: 340, y: 100 }));
		expect(must(e[2]).resources.health).toBe(35);
		expect(must(e[1]).resources.health).toBe(35);
		expect(must(e[0]).resources.health).toBe(75);
	});

	test("Разряд: проводник дальше 150 от цепи не задет", () => {
		const { world, e } = arena([
			mage(100, 100),
			wolf({ x: 400, y: 100 }, { wetness: "wet" }),
			wolf({ x: 600, y: 100 }, { wetness: "wet" }),
		]);
		cast(world, must(e[0]), "L4-01", at({ x: 400, y: 100 }));
		expect(must(e[2]).resources.health).toBe(60);
	});
});
