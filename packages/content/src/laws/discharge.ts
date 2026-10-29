// docs/04-laws-catalog.md, L4-01 — Разряд. Урон + сотрясение (голова −20%) всем проводникам,
// до которых дошёл ток. Ток не разбирает своих и чужих.

import { type LawDef, TIERS } from "@combollect/core";

export const discharge: LawDef = {
	id: "L4-01",
	name: "Разряд",
	tier: TIERS.Electromagnetic,
	requires: { all: ["Conductor"] },
	excludes: {},
	form: "point",
	windup: 0.2,
	cooldown: 5,
	cost: { resource: 20, lore: null },
	gesture: true,
	basicAttack: false,
	params: {
		rangeUnits: 600,
		entryRadiusUnits: 32,
		linkRadiusUnits: 150,
		damage: 25,
		headDamagePct: 20,
		waterChargeSec: 3,
	},
	apply(ctx) {
		const p = ctx.params;
		const graph = ctx.conductionGraph(
			ctx.targetPoint(),
			p.entryRadiusUnits ?? 0,
			p.linkRadiusUnits ?? 0,
		);
		const struck = graph.entities.filter((e) => ctx.affects(e));
		for (const entity of struck) {
			ctx.damage(entity, p.damage ?? 0);
			ctx.damageZone(entity, "head", p.headDamagePct ?? 0);
		}
		ctx.chargeWater(
			graph.waterCells,
			p.waterChargeSec ?? 0,
			p.damage ?? 0,
			p.headDamagePct ?? 0,
			struck,
		);
	},
};
