// docs/07-heroes.md, «Хронист».

import type { HeroDef } from "./hero.ts";

export const chronist: HeroDef = {
	id: "chronist",
	name: "Хронист",
	lore:
		"Учёный, который провёл в остановленном времени столетие, пытаясь спасти погибшую семью. " +
		"Не спас. Вышел из времени, но стал жить вне его: мир течёт мимо, а он стоит.",
	tags: [
		"Material",
		"Living",
		"Limbs",
		"Brain",
		"Blood",
		"Eyes",
		"Breathing",
		"Mind",
		"Emotions",
		"Trauma:Loss",
		"Trauma:Loneliness",
		"WarmBlooded",
		"Flammable",
		"Atomic",
		"InSpace",
		"OutOfTime",
		"TimeAnchor",
		"Mass:Medium",
	],
	laws: [
		{ lawId: "L2-00", key: null },
		{ lawId: "L7-01", key: "Q" },
		// ВРЕМЕННО (этап 2): прокачки нет, поэтому Остановка дана сразу, а не на вершине
		// прокачки Замедления (docs/04-laws-catalog.md, L7-02; docs/dev/stage-2.md).
		{ lawId: "L7-02", key: "R", temporary: "этап 2: дана сразу, без прокачки" },
	],
	// «Хронос» восстанавливается очень медленно, быстрее — когда Хронист стоит на месте.
	resource: { name: "Хронос", value: 100, regenPerSec: 0.25, standingRegenPerSec: 2 },
	health: 100,
	radiusUnits: 16,
	moveSpeed: 300,
	// Старое хрупкое тело: зоны теряют целостность на 30% быстрее.
	fragility: 1.3,
	strengths: "Определяет момент командного боя для всей карты.",
	weaknesses:
		"Старое хрупкое тело (зоны теряют целостность на 30% быстрее); двойная травма — " +
		"очень уязвим к давлению на психику.",
	priceOfPower: "Старение: каждое применение навсегда снижает максимум здоровья.",
	role: "Поддержка, инициатор",
};
