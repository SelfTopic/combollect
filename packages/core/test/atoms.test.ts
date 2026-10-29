import { describe, expect, test } from "vitest";
import { cellIndexAt, cellsInRadius, createGrid, waterRegion } from "../src/grid.ts";
import { createRng, nextFloat, nextInt } from "../src/rng.ts";
import { excludedBy, isTagId, massFactor, matchesQuery, type TagId } from "../src/tags.ts";

const tags = (...list: TagId[]): Set<TagId> => new Set(list);

describe("Метки", () => {
	test("реестр знает метки из словаря и не знает выдуманных", () => {
		expect(isTagId("OutOfTime")).toBe(true);
		expect(isTagId("Trauma:Loss")).toBe(true);
		expect(isTagId("Stunned")).toBe(false);
	});

	test("запрос «все из» требует каждую метку", () => {
		expect(matchesQuery({ all: ["Material", "Living"] }, tags("Material", "Living"))).toBe(true);
		expect(matchesQuery({ all: ["Material", "Living"] }, tags("Material"))).toBe(false);
	});

	test("запрос «любая из» требует хотя бы одну метку", () => {
		expect(matchesQuery({ any: ["Conductor", "Living"] }, tags("Living"))).toBe(true);
		expect(matchesQuery({ any: ["Conductor", "Living"] }, tags("Material"))).toBe(false);
	});

	test("пустой запрос исключений никого не исключает", () => {
		expect(excludedBy({}, tags("OutOfTime"))).toBe(false);
		expect(excludedBy({ any: ["OutOfTime"] }, tags("OutOfTime"))).toBe(true);
	});

	test("чем тяжелее метка массы, тем больше масса", () => {
		expect(massFactor(tags("Mass:Light"))).toBeLessThan(massFactor(tags("Mass:Medium")));
		expect(massFactor(tags("Mass:Heavy"))).toBeLessThan(massFactor(tags("Mass:Huge")));
		expect(massFactor(tags("Material"))).toBe(1);
	});
});

describe("Случайность мира", () => {
	test("один сид даёт одну и ту же последовательность", () => {
		const a = createRng(42);
		const b = createRng(42);
		const seqA = Array.from({ length: 5 }, () => nextFloat(a));
		const seqB = Array.from({ length: 5 }, () => nextFloat(b));
		expect(seqA).toEqual(seqB);
	});

	test("разные сиды дают разные последовательности", () => {
		expect(nextFloat(createRng(1))).not.toBe(nextFloat(createRng(2)));
	});

	test("целые числа лежат в заданных границах", () => {
		const rng = createRng(7);
		for (let i = 0; i < 100; i++) {
			const n = nextInt(rng, 3, 5);
			expect(n).toBeGreaterThanOrEqual(3);
			expect(n).toBeLessThanOrEqual(5);
		}
	});
});

describe("Карта", () => {
	test("точка попадает в свою клетку, за краем карты клетки нет", () => {
		const grid = createGrid(4, 4);
		expect(cellIndexAt(grid, { x: 40, y: 70 })).toBe(2 * 4 + 1);
		expect(cellIndexAt(grid, { x: -1, y: 0 })).toBeNull();
	});

	test("связная вода находится целиком, суша её разрывает", () => {
		// Вода в столбцах 0–1, суша в столбце 2, вода в столбце 3.
		const grid = createGrid(4, 2, (x) => (x === 2 ? "ground" : "water"));
		expect(waterRegion(grid, 0)).toEqual([0, 1, 4, 5]);
		expect(waterRegion(grid, 2)).toEqual([]);
	});

	test("клетки в радиусе считаются по центрам", () => {
		const grid = createGrid(10, 10);
		expect(cellsInRadius(grid, { x: 16, y: 16 }, 10)).toEqual([0]);
		expect(cellsInRadius(grid, { x: 32, y: 16 }, 17)).toEqual([0, 1]);
	});
});
