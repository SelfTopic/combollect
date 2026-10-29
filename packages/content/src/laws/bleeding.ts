// docs/04-laws-catalog.md, L1-02 — Кровотечение. Глубокая рана: сердце качает кровь наружу.
// Каждый удар — стак кровопотери: −2 здоровья за 100 единиц пути, −0.5 в секунду стоя.
// Кровь течёт и след ложится по часам раненого и клеток (это делает ядро).

import { type LawDef, TIERS } from "@combollect/core";

export const bleeding: LawDef = {
	id: "L1-02",
	name: "Кровотечение",
	tier: TIERS.Flesh,
	requires: { all: ["Blood"] },
	excludes: {},
	// Удар клинком. ДОПУЩЕНИЕ: в каталоге «снаряд или удар»; на этапе 2 — удар, см. decisions.md.
	form: "melee",
	windup: 0.2,
	cooldown: 3,
	cost: { resource: 10, lore: null },
	gesture: true,
	basicAttack: false,
	params: { rangeUnits: 40, healthPer100Units: 2, healthPerSecStanding: 0.5, trailSec: 60 },
	apply(ctx) {
		if (ctx.target.kind !== "entity") return;
		const target = ctx.world.entities.get(ctx.target.id);
		if (target === undefined || !ctx.affects(target)) return;
		const p = ctx.params;
		ctx.wound(target, {
			healthPer100Units: p.healthPer100Units ?? 0,
			healthPerSecStanding: p.healthPerSecStanding ?? 0,
			trailSec: p.trailSec ?? 0,
		});
	},
};
