// docs/04-laws-catalog.md, «Базовая атака — тоже закон». Удар оружием или кулаком — механика (уровень 2).
// Бесплотных не задевает: удар проходит насквозь.

import { type LawDef, TIERS } from "@combollect/core";

export const strike: LawDef = {
	id: "L2-00",
	name: "Удар",
	tier: TIERS.Mechanics,
	requires: { all: ["Material"] },
	excludes: {},
	form: "melee",
	windup: 0.2,
	cooldown: 1,
	cost: { resource: 0, lore: null },
	gesture: true,
	basicAttack: true,
	params: { rangeUnits: 40, damage: 10 },
	apply(ctx) {
		if (ctx.target.kind !== "entity") return;
		const target = ctx.world.entities.get(ctx.target.id);
		if (target !== undefined && ctx.affects(target)) ctx.damage(target, ctx.params.damage ?? 0);
	},
};
