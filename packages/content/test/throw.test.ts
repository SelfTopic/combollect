import type { SpawnSpec } from "@combollect/core";
import { runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, rock, wolf } from "../src/index.ts";
import { arena, at, cast, count, must } from "./helpers.ts";

const ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Бросок (L2-02)", () => {
	test("Бросок: нож — отдельная сущность: материальный снаряд во времени", () => {
		const { world, e } = arena([mage(100, 100)]);
		cast(world, must(e[0]), "L2-02", at({ x: 600, y: 100 }));
		const knife = [...world.entities.values()].find((x) => x.name === "Нож");
		expect(knife).toBeDefined();
		expect([...(knife?.tags ?? [])]).toEqual(
			expect.arrayContaining(["Material", "Projectile", "InTime"]),
		);
	});

	test("Бросок: нож бьёт первого на пути, даже союзника", () => {
		const { world, e } = arena([
			mage(100, 100),
			human({ x: 250, y: 100 }, { name: "Союзник" }),
			wolf({ x: 400, y: 100 }),
		]);
		cast(world, must(e[0]), "L2-02", at({ x: 600, y: 100 }));
		runSeconds(world, 1.5);
		expect(e[1]?.resources.health).toBe(80);
		expect(e[2]?.resources.health).toBe(60);
	});

	test("Бросок: нож пролетает сквозь бесплотного", () => {
		const { world, e } = arena([mage(100, 100), ghost(250, 100), wolf({ x: 400, y: 100 })]);
		cast(world, must(e[0]), "L2-02", at({ x: 600, y: 100 }));
		runSeconds(world, 1.5);
		expect(e[1]?.resources.health).toBe(50);
		expect(e[2]?.resources.health).toBe(40);
	});

	test("Бросок: нож ударяется в камень", () => {
		const { world, e } = arena([
			mage(100, 100),
			rock({ x: 250, y: 100 }),
			wolf({ x: 400, y: 100 }),
		]);
		cast(world, must(e[0]), "L2-02", at({ x: 600, y: 100 }));
		runSeconds(world, 1.5);
		expect(e[2]?.resources.health).toBe(60);
		expect(count(world, "projectileHit", e[1]?.id)).toBe(1);
	});
});
