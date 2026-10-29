// Шаблон героя по docs/07-heroes.md: лор, метки, законы, лорный ресурс, слабости, цена силы.

import type { LawId, LoreSpec, SpawnSpec, TagId, TeamId, Units, Vec2 } from "@combollect/core";

/** Клавиша закона (docs/10-controls.md): Q/W/E — законы героя, R — особый закон. */
export type LawKey = "Q" | "W" | "E" | "R";

export interface HeroLaw {
	readonly lawId: LawId;
	/** null — базовая атака (ПКМ по цели). */
	readonly key: LawKey | null;
	/** Временный закон этапа 2 (прокачки ещё нет) — пометка для интерфейса и отчёта. */
	readonly temporary?: string;
}

export interface HeroDef {
	readonly id: string;
	readonly name: string;
	readonly lore: string;
	readonly tags: readonly TagId[];
	readonly laws: readonly HeroLaw[];
	readonly resource: LoreSpec;
	readonly health: number;
	readonly radiusUnits: Units;
	readonly moveSpeed: number;
	/** Хрупкость тела, 1 — обычная. */
	readonly fragility: number;
	readonly strengths: string;
	readonly weaknesses: string;
	readonly priceOfPower: string;
	readonly role: string;
}

/** Метки живого человека (docs/02-atoms.md) без времени и массы — их задаёт каждый герой. */
export const LIVING_HUMAN: readonly TagId[] = [
	"Material",
	"Living",
	"Limbs",
	"Brain",
	"Blood",
	"Eyes",
	"Breathing",
	"Mind",
	"Emotions",
	"WarmBlooded",
	"Flammable",
	"Atomic",
	"InSpace",
];

export function heroSpawn(
	hero: HeroDef,
	position: Vec2,
	team: TeamId,
	name: string = hero.name,
): SpawnSpec {
	return {
		name,
		tags: [...hero.tags, "Hero"],
		team,
		position,
		health: hero.health,
		radiusUnits: hero.radiusUnits,
		moveSpeed: hero.moveSpeed,
		fragility: hero.fragility,
		laws: hero.laws.map((l) => l.lawId),
		lore: hero.resource,
	};
}
