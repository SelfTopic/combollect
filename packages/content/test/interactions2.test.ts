// Взаимодействия из таблицы docs/05-interactions.md, которые касаются законов этапа 2.

import { issueCommand } from "@combollect/core";
import { createTestWorld, eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { allLaws, human, outOfTimeHuman, specialInteractions } from "../src/index.ts";
import { arena, at, cast, must, on, ready } from "./helpers.ts";

const caster = (x: number, y: number) =>
	outOfTimeHuman(
		{ x, y },
		{
			name: "Носитель",
			laws: ["L1-01", "L1-02", "L3-01"],
			lore: { name: "Запас", value: 1000 },
		},
	);

describe("Взаимодействия законов этапа 2", () => {
	test("Пламя + Кровотечение: прижигание снимает все стаки", () => {
		const { world, e } = arena([caster(100, 100), human({ x: 140, y: 100 }, { name: "Раненый" })]);
		const [mage, hurt] = [must(e[0]), must(e[1])];
		cast(world, mage, "L1-02", on(hurt));
		ready(mage, "L1-02");
		cast(world, mage, "L1-02", on(hurt));
		expect(hurt.state.wounds).toHaveLength(2);
		cast(world, mage, "L3-01", at(hurt.position));
		expect(hurt.state.wounds).toHaveLength(0);
		const note = eventsOf(world, "bleeding", hurt.id).at(-1)?.note;
		expect(note).toBe("прижигание");
	});

	test("Пламя + Кровотечение: прижигание обжигает", () => {
		const { world, e } = arena([caster(100, 100), human({ x: 140, y: 100 }, { name: "Раненый" })]);
		const [mage, hurt] = [must(e[0]), must(e[1])];
		cast(world, mage, "L1-02", on(hurt));
		cast(world, mage, "L3-01", at(hurt.position));
		const after = hurt.resources.health;
		runSeconds(world, 3);
		// Стоя без ран он больше не теряет кровь; всё, что он теряет, — ожог.
		expect(hurt.state.wounds).toHaveLength(0);
		expect(after - hurt.resources.health).toBeGreaterThan(3);
	});

	test("Пламя + Кровотечение: прижечь можно и себя — свой огонь жжёт носителя", () => {
		const { world, e } = arena([caster(100, 100)]);
		const mage = must(e[0]);
		cast(world, mage, "L1-02", on(mage));
		cast(world, mage, "L3-01", at(mage.position));
		expect(mage.state.wounds).toHaveLength(0);
	});

	test("Пламя + Кровотечение: мокрая рана не прижигается — тепло уходит на высыхание", () => {
		const wet = human({ x: 140, y: 100 }, { name: "Мокрый", wetness: "soaked" });
		const { world, e } = arena([caster(100, 100), wet]);
		const [mage, hurt] = [must(e[0]), must(e[1])];
		cast(world, mage, "L1-02", on(hurt));
		cast(world, mage, "L3-01", at(hurt.position));
		expect(hurt.state.wounds).toHaveLength(1);
		expect(hurt.state.wetness).toBe("wet");
	});

	test("Пламя + Кровотечение: это особое взаимодействие — без него огонь раны не закрывает", () => {
		expect(specialInteractions.map((i) => i.row)).toEqual(["Пламя + Кровотечение"]);
		const { world, entities } = createTestWorld({
			laws: allLaws,
			entities: [caster(100, 100), human({ x: 140, y: 100 }, { name: "Раненый" })],
		});
		const [mage, hurt] = [must(entities[0]), must(entities[1])];
		cast(world, mage, "L1-02", on(hurt));
		cast(world, mage, "L3-01", at(hurt.position));
		expect(hurt.state.wounds).toHaveLength(1);
	});

	test("Перелом (ноги) + Кровотечение: ползком теряешь меньше крови в секунду", () => {
		const { world, e } = arena([
			caster(100, 100),
			human({ x: 140, y: 100 }, { name: "Целый" }),
			human({ x: 100, y: 140 }, { name: "Хромой" }),
		]);
		const [mage, whole, lame] = [must(e[0]), must(e[1]), must(e[2])];
		for (let i = 0; i < 3; i++) {
			ready(mage, "L1-01");
			cast(world, mage, "L1-01", on(lame));
		}
		expect(lame.state.body?.legs).toBe(0);
		cast(world, mage, "L1-02", on(whole));
		ready(mage, "L1-02");
		cast(world, mage, "L1-02", on(lame));
		issueCommand(world, whole, { kind: "move", to: { x: 1200, y: 100 } });
		issueCommand(world, lame, { kind: "move", to: { x: 1200, y: 140 } });
		const [w0, l0] = [whole.resources.health, lame.resources.health];
		runSeconds(world, 2);
		const wholeLoss = w0 - whole.resources.health;
		const lameLoss = l0 - lame.resources.health;
		expect(lameLoss).toBeCloseTo(wholeLoss * 0.3, 0);
	});
});
