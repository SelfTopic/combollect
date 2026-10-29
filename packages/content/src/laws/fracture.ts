// docs/04-laws-catalog.md, L1-01 — Перелом. Точный удар, ломающий кость: руки или ноги цели −40%.
// Зона выбирается направлением удара. Бесплотным и тем, у кого нет конечностей, ломать нечего.

import { type BodyZone, type Entity, type LawDef, TIERS, type Vec2 } from "@combollect/core";

/**
 * Направление удара: в верхнюю половину тела цели (на экране — выше её центра) — по рукам,
 * в нижнюю — по ногам. Без направления — по ногам. ДОПУЩЕНИЕ, см. docs/dev/decisions.md.
 */
export function fractureZone(target: Entity, aim: Vec2 | undefined): BodyZone {
	return aim !== undefined && aim.y < target.position.y ? "arms" : "legs";
}

export const fracture: LawDef = {
	id: "L1-01",
	name: "Перелом",
	tier: TIERS.Flesh,
	requires: { all: ["Limbs"] },
	excludes: { any: ["Incorporeal"] },
	form: "melee",
	// Замах 0.3 с, его видно.
	windup: 0.3,
	cooldown: 4,
	cost: { resource: 15, lore: null },
	gesture: true,
	basicAttack: false,
	params: { rangeUnits: 40, zonePct: 40 },
	apply(ctx) {
		if (ctx.target.kind !== "entity") return;
		const target = ctx.world.entities.get(ctx.target.id);
		if (target === undefined || !ctx.affects(target)) return;
		ctx.damageZone(target, fractureZone(target, ctx.target.aim), ctx.params.zonePct ?? 0);
	},
};
