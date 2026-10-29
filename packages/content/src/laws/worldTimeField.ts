// Общее для законов времени L7-01 и L7-02: поле на всю карту и временной шрам в точке носителя.
// Числа — в параметрах каждого закона.

import type { LawContext } from "@combollect/core";

export function applyWorldTimeField(ctx: LawContext, name: string): void {
	const p = ctx.params;
	const { requires, excludes } = ctx.law;
	ctx.addTimeField({
		factor: p.factor ?? 1,
		durationSec: p.durationSec ?? 0,
		requires,
		excludes,
		name,
	});
	// Временной шрам в точке носителя (docs/09-map.md).
	ctx.addTimeField({
		factor: p.scarFactor ?? 1,
		durationSec: p.scarSec ?? 0,
		requires,
		excludes,
		area: { center: ctx.bearer.position, radiusUnits: p.scarRadiusUnits ?? 0 },
		name: "Временной шрам",
	});
}
