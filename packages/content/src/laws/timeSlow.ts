// docs/04-laws-catalog.md, L7-01 — Замедление времени. Множитель ×0.25 для всех `InTime` на всей карте,
// включая союзников и самого носителя, если он во времени. Длительность — в часах носителя.

import { type LawDef, TIERS } from "@combollect/core";

export const timeSlow: LawDef = {
	id: "L7-01",
	name: "Замедление времени",
	tier: TIERS.Time,
	requires: { all: ["InTime"] },
	excludes: { any: ["OutOfTime"] },
	form: "global",
	windup: 1.5,
	cooldown: 60,
	// «Хронос» + старение −3% макс. здоровья навсегда за применение.
	cost: { resource: 40, lore: { agingMaxHealthPct: 3 } },
	gesture: true,
	basicAttack: false,
	params: {
		factor: 0.25,
		durationSec: 4,
		// Временной шрам в точке носителя (docs/09-map.md): ×0.9 на 30 с.
		scarFactor: 0.9,
		scarSec: 30,
		scarRadiusUnits: 64,
	},
	apply(ctx) {
		const p = ctx.params;
		const { requires, excludes } = ctx.law;
		ctx.addTimeField({
			factor: p.factor ?? 1,
			durationSec: p.durationSec ?? 0,
			requires,
			excludes,
			name: "Замедление времени",
		});
		ctx.addTimeField({
			factor: p.scarFactor ?? 1,
			durationSec: p.scarSec ?? 0,
			requires,
			excludes,
			area: { center: ctx.bearer.position, radiusUnits: p.scarRadiusUnits ?? 0 },
			name: "Временной шрам",
		});
	},
};
