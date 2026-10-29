import { describe, expect, test } from "vitest";
import { push } from "../src/api/deliver.ts";
import { cellAt } from "../src/grid.ts";
import { createTestWorld, runSeconds } from "../src/testing.ts";
import { person, testLaws } from "./helpers.ts";

describe("Карта", () => {
	test("сущность на клетке воды промокает", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			grid: { width: 10, height: 10, surfaceAt: (x) => (x < 3 ? "water" : "ground") },
			entities: [person("В воде", { x: 40, y: 40 }), person("На суше", { x: 200, y: 40 })],
		});
		runSeconds(world, 0.1);
		expect(entities[0]?.state.wetness).toBe("soaked");
		expect(entities[1]?.state.wetness).toBe("dry");
	});

	test("вышедший из воды сохнет: промокший → мокрый → сухой", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [person("А", { x: 40, y: 40 }, { wetness: "soaked" })],
		});
		runSeconds(world, 5.5);
		expect(entities[0]?.state.wetness).toBe("wet");
		runSeconds(world, 10);
		expect(entities[0]?.state.wetness).toBe("dry");
	});

	test("мокрая сущность — проводник, сухая — нет", async () => {
		const { hasTag } = await import("../src/entityTags.ts");
		const { entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("Мокрый", { x: 40, y: 40 }, { wetness: "wet" }),
				person("Сухой", { x: 100, y: 40 }),
			],
		});
		expect(entities[0] && hasTag(entities[0], "Conductor")).toBe(true);
		expect(entities[1] && hasTag(entities[1], "Conductor")).toBe(false);
	});

	test("лёд уменьшает трение: толчок уносит вдвое дальше", () => {
		const run = (surface: "ground" | "ice") => {
			const { world, entities } = createTestWorld({
				laws: testLaws,
				grid: { width: 40, height: 4, surfaceAt: () => surface },
				entities: [person("А", { x: 100, y: 64 })],
			});
			const a = entities[0];
			if (a === undefined) throw new Error();
			expect(cellAt(world.grid, a.position)?.surface).toBe(surface);
			push(world, a, { x: 1, y: 0 }, 150, {});
			runSeconds(world, 3);
			return a.position.x - 100;
		};
		const onGround = run("ground");
		const onIce = run("ice");
		expect(onGround).toBeCloseTo(150, -1);
		expect(onIce / onGround).toBeCloseTo(2, 1);
	});

	test("тяжёлого толчок уносит ближе: дистанция обратно пропорциональна массе", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			grid: { width: 40, height: 8 },
			entities: [
				person("Средний", { x: 100, y: 64 }),
				person("Тяжёлый", { x: 100, y: 192 }, { tags: ["Material", "Mass:Heavy", "InTime"] }),
			],
		});
		const [medium, heavy] = entities;
		if (medium === undefined || heavy === undefined) throw new Error();
		push(world, medium, { x: 1, y: 0 }, 200, {});
		push(world, heavy, { x: 1, y: 0 }, 200, {});
		runSeconds(world, 3);
		expect((heavy.position.x - 100) / (medium.position.x - 100)).toBeCloseTo(0.5, 1);
	});
});
