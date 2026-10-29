// docs/04-laws-catalog.md, L2-02 — Бросок. Брошенный предмет — отдельная сущность
// (`Material`, `Projectile`, `InTime`) и подчиняется всем законам, как любая сущность.

import { add, type LawDef, normalize, rotate, scale, sub, TIERS } from "@combollect/core";

const KNIFE_RADIUS = 4;

export const throwLaw: LawDef = {
	id: "L2-02",
	name: "Бросок",
	tier: TIERS.Mechanics,
	requires: { all: ["Material"] },
	excludes: {},
	form: "projectile",
	windup: 0.15,
	cooldown: 1.5,
	cost: { resource: 10, lore: null },
	gesture: true,
	basicAttack: false,
	params: { damage: 20, speed: 600, flightRangeUnits: 700, count: 1, spreadDeg: 10 },
	apply(ctx) {
		const { bearer, params } = ctx;
		const aim = normalize(sub(ctx.targetPoint(), bearer.position));
		const count = Math.max(1, Math.round(params.count ?? 1));
		const spread = ((params.spreadDeg ?? 0) * Math.PI) / 180;
		for (let i = 0; i < count; i++) {
			const dir = rotate(aim, (i - (count - 1) / 2) * spread);
			// Нож появляется у края руки — дальше он сам по себе.
			const position = add(
				bearer.position,
				scale(dir, bearer.stats.radiusUnits + KNIFE_RADIUS + 1),
			);
			ctx.spawn({
				name: "Нож",
				tags: [
					"Material",
					"Projectile",
					"InTime",
					"InSpace",
					"Atomic",
					"Nonflammable",
					"Conductor",
					"Mass:Light",
				],
				position,
				velocity: scale(dir, params.speed ?? 0),
				health: 5,
				radiusUnits: KNIFE_RADIUS,
				moveSpeed: 0,
				projectile: {
					lawId: ctx.law.id,
					ownerId: bearer.id,
					remainingRange: params.flightRangeUnits ?? 0,
					damage: params.damage ?? 0,
				},
			});
		}
	},
};
