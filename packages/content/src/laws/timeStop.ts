// docs/04-laws-catalog.md, L7-02 — Остановка времени. То же, что L7-01, но множитель ×0:
// стоит всё `InTime` на всей карте — враги, союзники, снаряды, огонь, кровь, таймеры.
// Правила остановки — docs/06-time-system.md. Длительность — в часах носителя.

import { type LawDef, TIERS } from "@combollect/core";
import { applyWorldTimeField } from "./worldTimeField.ts";

export const timeStop: LawDef = {
	id: "L7-02",
	name: "Остановка времени",
	tier: TIERS.Time,
	requires: { all: ["InTime"] },
	excludes: { any: ["OutOfTime"] },
	form: "global",
	// Подготовка как у замедления: весь мир «трещит» 1.5 с (docs/12-example-builds.md, сборка 1).
	windup: 1.5,
	cooldown: 90,
	// «Хронос» + старение −8% макс. здоровья навсегда за применение.
	cost: { resource: 60, lore: { agingMaxHealthPct: 8 } },
	gesture: true,
	basicAttack: false,
	params: {
		factor: 0,
		// Старт прокачки — 1.5 с часов носителя (docs/06-time-system.md, правило 5).
		durationSec: 1.5,
		scarFactor: 0.9,
		scarSec: 30,
		scarRadiusUnits: 64,
	},
	apply(ctx) {
		applyWorldTimeField(ctx, "Остановка времени");
	},
};
