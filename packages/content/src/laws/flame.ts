// docs/04-laws-catalog.md, L3-01 — Пламя. Температура +20 всему материальному в точке и земле под ней.
// Горение, распространение огня и выжженная земля — следствия температуры (это делает ядро).

import { type LawDef, TIERS } from "@combollect/core";

export const flame: LawDef = {
	id: "L3-01",
	name: "Пламя",
	tier: TIERS.Thermal,
	requires: { all: ["Material"] },
	excludes: {},
	form: "point",
	windup: 0.3,
	cooldown: 3,
	cost: { resource: 15, lore: null },
	gesture: true,
	basicAttack: false,
	params: { rangeUnits: 600, radiusUnits: 48, heat: 20 },
	apply(ctx) {
		const point = ctx.targetPoint();
		const radius = ctx.params.radiusUnits ?? 0;
		const heat = ctx.params.heat ?? 0;
		for (const entity of ctx.affectedInRadius(point, radius)) ctx.changeTemperature(entity, heat);
		for (const cell of ctx.cellsInRadius(point, radius)) ctx.changeCellTemperature(cell, heat);
	},
};
