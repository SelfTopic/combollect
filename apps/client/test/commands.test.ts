import { createMatch, fracture, throwLaw, timeStop } from "@combollect/content";
import { describe, expect, test } from "vitest";
import { castLaw, needsAim, rightClick } from "../src/game/commands.ts";

const match = () => createMatch({ allies: ["chronist", "shadow", "butcher"], enemy: "butcher" });

describe("Ввод → команды", () => {
	test("ПКМ по врагу — атаковать, пока он жив", () => {
		const m = match();
		const hero = m.allies[2];
		if (hero === undefined) throw new Error();
		const action = rightClick(m.world, hero, m.enemy.position, m.enemy.id);
		expect(action).toEqual({ kind: "attack", targetId: m.enemy.id, hold: true });
	});

	test("ПКМ по своему герою или по земле — идти", () => {
		const m = match();
		const [a, b] = m.allies;
		if (a === undefined || b === undefined) throw new Error();
		expect(rightClick(m.world, a, b.position, b.id).kind).toBe("move");
		expect(rightClick(m.world, a, { x: 500, y: 500 }, null)).toEqual({
			kind: "move",
			to: { x: 500, y: 500 },
		});
	});

	test("Закон времени — сразу, без прицела и без цели", () => {
		expect(needsAim(timeStop)).toBe(false);
		const result = castLaw(timeStop, 2, { x: 0, y: 0 }, null);
		expect(result).toEqual({
			ok: true,
			action: { kind: "useLaw", slot: 2, target: { kind: "none" } },
		});
	});

	test("Ближний закон без цели под курсором не отдаётся", () => {
		expect(castLaw(fracture, 1, { x: 0, y: 0 }, null).ok).toBe(false);
	});

	test("Ближний закон по цели: подойти, ударить, направление удара — точка курсора", () => {
		const result = castLaw(fracture, 1, { x: 10, y: 5 }, 7);
		expect(result).toEqual({
			ok: true,
			action: {
				kind: "useLaw",
				slot: 1,
				target: { kind: "entity", id: 7, aim: { x: 10, y: 5 } },
				approach: true,
			},
		});
	});

	test("Бросок — в точку курсора", () => {
		const result = castLaw(throwLaw, 1, { x: 300, y: 200 }, null);
		expect(result).toEqual({
			ok: true,
			action: { kind: "useLaw", slot: 1, target: { kind: "point", point: { x: 300, y: 200 } } },
		});
	});
});
