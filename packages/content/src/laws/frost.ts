// docs/04-laws-catalog.md, L3-02 — Стужа. Температура −15; мокрое остывает вдвое сильнее, вода
// и земля покрываются льдом (это делает ядро). Сильно страдают теплокровные, остальное — физически.

import { type LawDef, TIERS } from "@combollect/core";

export const frost: LawDef = {
	id: "L3-02",
	name: "Стужа",
	tier: TIERS.Thermal,
	requires: { all: ["Material"] },
	excludes: {},
	form: "point",
	windup: 0.3,
	cooldown: 4,
	cost: { resource: 15, lore: null },
	gesture: true,
	basicAttack: false,
	params: { rangeUnits: 600, radiusUnits: 64, cold: 15 },
	apply(ctx) {
		const point = ctx.targetPoint();
		const radius = ctx.params.radiusUnits ?? 0;
		const cold = ctx.params.cold ?? 0;
		for (const entity of ctx.affectedInRadius(point, radius)) ctx.changeTemperature(entity, -cold);
		for (const cell of ctx.cellsInRadius(point, radius)) ctx.changeCellTemperature(cell, -cold);
	},
};
