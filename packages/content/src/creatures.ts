// Тестовые существа этапа 1: только наборы меток (docs/dev/stage-1.md, п. 7).
// Метки — по docs/02-atoms.md и docs/09-map.md.

import type { LawId, SpawnSpec, TagId, Vec2, Wetness } from "@combollect/core";

export interface CreatureOptions {
	readonly name?: string;
	/** Законы сверх базовой атаки. */
	readonly laws?: readonly LawId[];
	readonly lore?: { readonly name: string; readonly value: number; readonly regenPerSec?: number };
	readonly wetness?: Wetness;
	readonly temperature?: number;
}

const HUMAN_BODY: readonly TagId[] = [
	"Material",
	"Living",
	"Limbs",
	"Brain",
	"Blood",
	"Eyes",
	"Breathing",
	"Mind",
	"Emotions",
	"Mass:Medium",
	"WarmBlooded",
	"Flammable",
	"Atomic",
	"InSpace",
];

function creature(
	base: {
		name: string;
		tags: readonly TagId[];
		health: number;
		radiusUnits: number;
		moveSpeed: number;
		laws: readonly LawId[];
	},
	position: Vec2,
	options: CreatureOptions,
): SpawnSpec {
	return {
		name: options.name ?? base.name,
		tags: base.tags,
		position,
		health: base.health,
		radiusUnits: base.radiusUnits,
		moveSpeed: base.moveSpeed,
		laws: [...base.laws, ...(options.laws ?? [])],
		lore: options.lore ?? { name: "Выносливость", value: 100, regenPerSec: 5 },
		...(options.wetness !== undefined ? { wetness: options.wetness } : {}),
		...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
	};
}

/** Человек: живой, теплокровный, горючий, во времени. */
export function human(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Человек",
			tags: [...HUMAN_BODY, "InTime"],
			health: 100,
			radiusUnits: 16,
			moveSpeed: 300,
			laws: ["L2-00"],
		},
		position,
		options,
	);
}

/** Человек вне времени (как Хронист или Тень-без-часов): часы не подчиняются чужим полям. */
export function outOfTimeHuman(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Человек вне времени",
			tags: [...HUMAN_BODY, "OutOfTime"],
			health: 100,
			radiusUnits: 16,
			moveSpeed: 300,
			laws: ["L2-00"],
		},
		position,
		options,
	);
}

/** Лесной волк (docs/02-atoms.md, «Пример полного описания сущности»). */
export function wolf(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Волк",
			tags: [
				"Material",
				"Living",
				"Limbs",
				"Brain",
				"Blood",
				"Eyes",
				"Breathing",
				"Emotions",
				"Mass:Medium",
				"WarmBlooded",
				"Flammable",
				"Atomic",
				"InSpace",
				"InTime",
				"Neutral",
			],
			health: 60,
			radiusUnits: 14,
			moveSpeed: 350,
			laws: ["L2-00"],
		},
		position,
		options,
	);
}

/** Каменный голем: безразумный, негорючий, огромная масса. Не живой: камень не болеет и не мёрзнет. */
export function stoneGolem(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Каменный голем",
			tags: [
				"Material",
				"Limbs",
				"Mindless",
				"Nonflammable",
				"Mass:Huge",
				"Atomic",
				"InSpace",
				"InTime",
			],
			health: 300,
			radiusUnits: 24,
			moveSpeed: 200,
			laws: ["L2-00"],
		},
		position,
		options,
	);
}

/** Дерево (docs/09-map.md): горит и исчезает навсегда. Вросло в землю. */
export function tree(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Дерево",
			tags: ["Material", "Living", "Flammable", "Atomic", "InSpace", "InTime", "Terrain"],
			health: 60,
			radiusUnits: 20,
			moveSpeed: 0,
			laws: [],
		},
		position,
		options,
	);
}

/** Камень (docs/09-map.md): укрытие и стена для импульса. */
export function rock(position: Vec2, options: CreatureOptions = {}): SpawnSpec {
	return creature(
		{
			name: "Камень",
			tags: ["Material", "Nonflammable", "Mass:Huge", "Atomic", "InSpace", "InTime", "Terrain"],
			health: 10000,
			radiusUnits: 24,
			moveSpeed: 0,
			laws: [],
		},
		position,
		options,
	);
}
