// docs/07-heroes.md, «Мясник».

import { type HeroDef, LIVING_HUMAN } from "./hero.ts";

export const butcher: HeroDef = {
	id: "butcher",
	name: "Мясник",
	lore:
		"Ветеран сотни войн. Видел всё, ничего не боится. Знает, куда бить, чтобы человек больше " +
		"не встал. Травм нет — сгорели все.",
	tags: [...LIVING_HUMAN, "InTime", "IronWill", "Regenerating", "Mass:Heavy"],
	laws: [
		// Меч Мясника — механика (docs/04-laws-catalog.md, «Базовая атака»).
		{ lawId: "L2-00", key: null },
		{ lawId: "L1-01", key: "Q" },
		{ lawId: "L1-02", key: "W" },
		{ lawId: "L2-01", key: "E" },
	],
	// «Выносливость» быстро восстанавливается.
	resource: { name: "Выносливость", value: 100, regenPerSec: 10 },
	health: 150,
	radiusUnits: 18,
	moveSpeed: 280,
	fragility: 1,
	strengths:
		"Дешёвые частые точечные законы. Лучший охотник на носителей высоких сил: сломал Хронисту " +
		"руки — тот не сделает жест.",
	weaknesses:
		"Все законы требуют контакта; бесплотные недосягаемы; бессилен против искажения пространства.",
	priceOfPower: "Нет лорной цены (платит только выносливостью). Компенсация — малый масштаб.",
	role: "Охотник, танк",
};
