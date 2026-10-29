// docs/04-laws-catalog.md, L2-01 — Импульс. Удар чистой силой конусом перед носителем.
// Отбрасывание обратно пропорционально массе; удар о стену или тело — урон (это делает ядро).

import { distance, type LawDef, normalize, sub, TIERS } from "@combollect/core";

export const impulse: LawDef = {
	id: "L2-01",
	name: "Импульс",
	tier: TIERS.Mechanics,
	requires: { all: ["Material"] },
	excludes: {},
	form: "cone",
	windup: 0,
	cooldown: 4,
	cost: { resource: 20, lore: null },
	gesture: true,
	basicAttack: false,
	params: { coneRangeUnits: 150, coneAngleDeg: 90, distance: 200 },
	apply(ctx) {
		const origin = ctx.bearer.position;
		const facing = normalize(sub(ctx.targetPoint(), origin));
		const halfAngle = (((ctx.params.coneAngleDeg ?? 90) / 2) * Math.PI) / 180;
		const range = ctx.params.coneRangeUnits ?? 0;
		for (const entity of ctx.affectedInRadius(origin, range)) {
			// Носитель не стоит перед самим собой; всё остальное в конусе — свои, чужие, снаряды.
			if (distance(entity.position, origin) === 0) continue;
			const toEntity = normalize(sub(entity.position, origin));
			const angle = Math.acos(
				Math.max(-1, Math.min(1, facing.x * toEntity.x + facing.y * toEntity.y)),
			);
			if (angle > halfAngle) continue;
			ctx.push(entity, toEntity, ctx.params.distance ?? 0);
		}
	},
};
