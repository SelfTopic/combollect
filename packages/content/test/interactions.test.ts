// Взаимодействия из таблицы docs/05-interactions.md, которые касаются законов этапа 1.
// Все они системные: законы ничего не знают друг о друге.

import { cellAt, type Entity, type Surface } from "@combollect/core";
import { eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, rock, wolf } from "../src/index.ts";
import { arena, at, cast, cellPoint, count, must, ready } from "./helpers.ts";

const caster = (x: number, y: number) =>
	human(
		{ x, y },
		{
			name: "Носитель",
			laws: ["L2-01", "L3-01", "L3-02", "L4-01"],
			lore: { name: "Запас", value: 1000 },
		},
	);

/** Лужа — клетки воды в столбцах 5–14 и строках 2–5. */
const puddle = (x: number, y: number): Surface =>
	x >= 5 && x <= 14 && y >= 2 && y <= 5 ? "water" : "ground";

function widen(entity: Entity, lawId: string, radiusUnits: number): void {
	const slot = entity.laws.find((s) => s.lawId === lawId);
	if (slot !== undefined) slot.params.radiusUnits = radiusUnits;
}

describe("Взаимодействия законов этапа 1", () => {
	test("Мокрый + Разряд: ток бьёт всех в луже, включая союзников и носителя", () => {
		const { world, e } = arena(
			[
				human({ x: 176, y: 112 }, { name: "Носитель в луже", laws: ["L4-01"] }),
				human({ x: 300, y: 150 }, { name: "Союзник в луже" }),
				wolf({ x: 460, y: 112 }, { name: "Волк в луже" }),
				wolf({ x: 460, y: 300 }, { name: "Сухой волк на берегу" }),
			],
			puddle,
		);
		runSeconds(world, 0.1);
		// Носитель и волк дальше 150 друг от друга: их связывает вода, а не расстояние.
		cast(world, must(e[0]), "L4-01", at({ x: 460, y: 112 }));
		expect(must(e[0]).resources.health).toBe(75);
		expect(must(e[1]).resources.health).toBe(75);
		expect(must(e[2]).resources.health).toBe(35);
		expect(must(e[3]).resources.health).toBe(60);
	});

	test("Стужа + Лужа: замёрзшая лужа не проводит ток", () => {
		const { world, e } = arena(
			[caster(48, 112), wolf({ x: 300, y: 112 }), wolf({ x: 380, y: 112 })],
			puddle,
		);
		const bearer = must(e[0]);
		runSeconds(world, 0.1);
		widen(bearer, "L3-02", 400);
		cast(world, bearer, "L3-02", at({ x: 320, y: 112 }));
		expect(cellAt(world.grid, { x: 320, y: 112 })?.surface).toBe("ice");
		cast(world, bearer, "L4-01", at({ x: 300, y: 112 }));
		expect(must(e[1]).resources.health).toBe(60);
		expect(must(e[2]).resources.health).toBe(60);
	});

	test("Стужа + Мокрый: мокрый замерзает вдвое быстрее", () => {
		const { world, e } = arena([
			caster(48, 48),
			wolf({ x: 400, y: 100 }, { wetness: "wet" }),
			wolf({ x: 430, y: 100 }),
		]);
		cast(world, must(e[0]), "L3-02", at({ x: 415, y: 100 }));
		expect(eventsOf(world, "temperature", e[1]?.id)[0]?.after).toBe(-30);
		expect(eventsOf(world, "temperature", e[2]?.id)[0]?.after).toBe(-15);
	});

	test("Пламя + Лёд: лёд тает в лужу", () => {
		const { world, e } = arena([caster(48, 48)], puddle);
		const bearer = must(e[0]);
		const point = cellPoint(9, 3);
		cast(world, bearer, "L3-02", at(point));
		expect(cellAt(world.grid, point)?.surface).toBe("ice");
		cast(world, bearer, "L3-01", at(point));
		expect(cellAt(world.grid, point)?.surface).toBe("water");
	});

	test("Пламя + Лёд: лёд на земле тает в мокрую землю", () => {
		const { world, e } = arena([caster(48, 48)]);
		const bearer = must(e[0]);
		const point = cellPoint(10, 10);
		cast(world, bearer, "L3-02", at(point));
		cast(world, bearer, "L3-01", at(point));
		expect(cellAt(world.grid, point)?.surface).toBe("ground");
		expect(cellAt(world.grid, point)?.moisture).toBe("wet");
	});

	test("Пламя + Мокрый: сначала высыхание, потом нагрев", () => {
		const { world, e } = arena([caster(48, 48), wolf({ x: 400, y: 100 }, { wetness: "wet" })]);
		const bearer = must(e[0]);
		const target = must(e[1]);
		cast(world, bearer, "L3-01", at(target.position));
		expect(target.state.wetness).toBe("dry");
		expect(target.state.temperature).toBe(0);
		ready(bearer, "L3-01");
		cast(world, bearer, "L3-01", at(target.position));
		expect(target.state.temperature).toBeGreaterThan(14);
	});

	test("Пламя + Мокрый: промокший не загорается даже от тройного пламени", () => {
		const { world, e } = arena([caster(48, 48), wolf({ x: 400, y: 100 }, { wetness: "soaked" })]);
		const bearer = must(e[0]);
		for (let i = 0; i < 3; i++) {
			ready(bearer, "L3-01");
			cast(world, bearer, "L3-01", at({ x: 400, y: 100 }));
		}
		expect(count(world, "ignited", e[1]?.id)).toBe(0);
	});

	test("Импульс + Лёд: отбрасывание вдвое дальше", () => {
		const flight = (surface: Surface): number => {
			const { world, e } = arena([caster(200, 200), wolf({ x: 300, y: 200 })], () => surface);
			cast(world, must(e[0]), "L2-01", at({ x: 400, y: 200 }));
			runSeconds(world, 3);
			return must(e[1]).position.x - 300;
		};
		expect(flight("ice") / flight("ground")).toBeCloseTo(2, 1);
	});

	test("Импульс + Камень: удар о камень наносит урон, камень не сдвигается", () => {
		const { world, e } = arena([
			caster(200, 200),
			wolf({ x: 300, y: 200 }),
			rock({ x: 400, y: 200 }),
		]);
		cast(world, must(e[0]), "L2-01", at({ x: 400, y: 200 }));
		runSeconds(world, 2);
		expect(must(e[1]).resources.health).toBeLessThan(60);
		expect(must(e[2]).position).toEqual({ x: 400, y: 200 });
		expect(count(world, "collision", e[1]?.id)).toBe(1);
	});

	test("Импульс + Камень: без камня отбрасывание урона не наносит", () => {
		const { world, e } = arena([caster(200, 200), wolf({ x: 300, y: 200 })]);
		cast(world, must(e[0]), "L2-01", at({ x: 400, y: 200 }));
		runSeconds(world, 2);
		expect(must(e[1]).resources.health).toBe(60);
	});
});
