// Прицел закона: дальность, зона, конус; подсветка цели — подействует или нет.

import type { Entity, LawDef, Vec2 } from "@combollect/core";
import { Graphics } from "pixi.js";
import { TIER_COLORS } from "./palette.ts";

export interface AimView {
	readonly law: LawDef;
	readonly params: Readonly<Record<string, number>>;
	readonly bearer: Entity;
	readonly bearerAt: Vec2;
	readonly cursor: Vec2;
	readonly hovered: Entity | null;
	/** null — подействует; строка — почему нет. */
	readonly blocked: string | null;
}

export class CursorLayer {
	readonly view = new Graphics();

	draw(aim: AimView | null, hover: { entity: Entity; at: Vec2 } | null): void {
		const g = this.view;
		g.clear();
		if (aim === null) {
			if (hover !== null) {
				const r = hover.entity.stats.radiusUnits + 5;
				g.circle(hover.at.x, hover.at.y, r).stroke({ width: 1.5, color: 0xffffff, alpha: 0.6 });
			}
			return;
		}
		const color = TIER_COLORS[aim.law.tier];
		const { bearerAt, cursor, params } = aim;
		const range = params.rangeUnits;
		if (range !== undefined) {
			const reach = aim.law.form === "melee" ? range + aim.bearer.stats.radiusUnits : range;
			g.circle(bearerAt.x, bearerAt.y, reach).stroke({ width: 1.5, color, alpha: 0.5 });
		}
		if (aim.law.form === "point") {
			g.circle(cursor.x, cursor.y, params.radiusUnits ?? 24)
				.fill({ color, alpha: 0.18 })
				.stroke({ width: 2, color });
		}
		if (aim.law.form === "projectile") {
			const flight = params.flightRangeUnits ?? 600;
			const dx = cursor.x - bearerAt.x;
			const dy = cursor.y - bearerAt.y;
			const len = Math.hypot(dx, dy) || 1;
			g.moveTo(bearerAt.x, bearerAt.y)
				.lineTo(bearerAt.x + (dx / len) * flight, bearerAt.y + (dy / len) * flight)
				.stroke({ width: 2, color, alpha: 0.6 });
		}
		if (aim.law.form === "cone") {
			const base = Math.atan2(cursor.y - bearerAt.y, cursor.x - bearerAt.x);
			const half = (((params.coneAngleDeg ?? 90) / 2) * Math.PI) / 180;
			const r = params.coneRangeUnits ?? 150;
			g.moveTo(bearerAt.x, bearerAt.y)
				.arc(bearerAt.x, bearerAt.y, r, base - half, base + half)
				.lineTo(bearerAt.x, bearerAt.y)
				.fill({ color, alpha: 0.18 })
				.stroke({ width: 2, color });
		}
		if (aim.hovered !== null) {
			const h = aim.hovered;
			const r = h.stats.radiusUnits + 6;
			const p = h.position;
			if (aim.blocked === null) {
				g.circle(p.x, p.y, r).stroke({ width: 3, color: 0x66ff88 });
			} else {
				// «Не подействует»: красный перечёркнутый круг.
				g.circle(p.x, p.y, r).stroke({ width: 3, color: 0xff3b3b });
				g.moveTo(p.x - r * 0.7, p.y + r * 0.7)
					.lineTo(p.x + r * 0.7, p.y - r * 0.7)
					.stroke({ width: 3, color: 0xff3b3b });
			}
		}
		g.circle(cursor.x, cursor.y, 4).fill(color);
	}
}
