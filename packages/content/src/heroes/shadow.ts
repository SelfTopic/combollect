// docs/07-heroes.md, «Тень-без-часов».

import { type HeroDef, LIVING_HUMAN } from "./hero.ts";

export const shadow: HeroDef = {
	id: "shadow",
	name: "Тень-без-часов",
	lore:
		"Наёмник, который однажды попал в остановленное время чужого боя и не вернулся оттуда " +
		"полностью. Теперь время не держит его.",
	tags: [...LIVING_HUMAN, "OutOfTime", "Mass:Light", "Trauma:Captivity"],
	laws: [
		{ lawId: "L2-00", key: null },
		{ lawId: "L2-02", key: "Q" },
		{ lawId: "L1-02", key: "W" },
	],
	resource: { name: "Выносливость", value: 100, regenPerSec: 5 },
	health: 100,
	radiusUnits: 14,
	moveSpeed: 330,
	fragility: 1,
	strengths:
		"В одиночку — обычный метатель ножей. В паре с Хронистом — главный исполнитель «стены ножей».",
	weaknesses: "Лёгкий (импульс отбрасывает далеко), травма плена, без союзника по времени средний.",
	priceOfPower: "Нет: платит только выносливостью.",
	role: "Исполнитель",
};
