// Время на экране (docs/dev/stage-2.md): подготовка закона времени видна всем — рябь экрана;
// пока время замедлено или стоит, мир тонирован сепией; временные шрамы видны на земле.

import { CELL_SIZE, isAlive, slotDef, TIERS, type Vec2, type World } from "@combollect/core";
import { Graphics } from "pixi.js";
import { TIME_COLOR } from "./palette.ts";

export interface TimeView {
	/** Кто сейчас готовит закон времени (рябь идёт от него). */
	readonly preparing: readonly Vec2[];
	/** Самый сильный глобальный множитель времени: 1 — норма, 0 — остановка. */
	readonly globalFactor: number;
}

export function readTime(world: World): TimeView {
	const preparing: Vec2[] = [];
	for (const entity of world.entities.values()) {
		const windup = entity.state.windup;
		const slot = windup === null ? undefined : entity.laws[windup.slot];
		if (slot !== undefined && isAlive(entity) && slotDef(world, slot).tier === TIERS.Time) {
			preparing.push(entity.position);
		}
	}
	let globalFactor = 1;
	for (const field of world.timeFields) {
		if (field.area === null) globalFactor = Math.min(globalFactor, field.factor);
	}
	return { preparing, globalFactor };
}

export class TimeLayer {
	readonly view = new Graphics();

	draw(world: World, time: TimeView, nowSec: number): void {
		const g = this.view;
		g.clear();
		const w = world.grid.width * CELL_SIZE;
		const h = world.grid.height * CELL_SIZE;
		if (time.globalFactor < 1) {
			// Мир «застыл»: сепия тем гуще, чем медленнее время.
			g.rect(0, 0, w, h).fill({ color: 0x8a6a2a, alpha: 0.1 + (1 - time.globalFactor) * 0.14 });
		}
		for (const field of world.timeFields) {
			if (field.area === null) continue;
			const { center, radiusUnits } = field.area;
			g.circle(center.x, center.y, radiusUnits).fill({ color: TIME_COLOR, alpha: 0.08 });
			g.circle(center.x, center.y, radiusUnits).stroke({
				width: 1.5,
				color: TIME_COLOR,
				alpha: 0.5,
			});
		}
		for (const p of time.preparing) {
			// «Весь мир трещит»: кольца бегут от носителя через всю карту.
			for (let i = 0; i < 4; i++) {
				const k = (nowSec * 0.9 + i / 4) % 1;
				g.circle(p.x, p.y, 30 + k * 1300).stroke({
					width: 3,
					color: TIME_COLOR,
					alpha: 0.55 * (1 - k),
				});
			}
			g.rect(0, 0, w, h).stroke({
				width: 10 + Math.sin(nowSec * 20) * 4,
				color: TIME_COLOR,
				alpha: 0.5,
			});
		}
	}

	/** Дрожание арены во время подготовки — та же «рябь экрана». */
	shake(time: TimeView, nowSec: number): Vec2 {
		if (time.preparing.length === 0) return { x: 0, y: 0 };
		return { x: Math.sin(nowSec * 47) * 2, y: Math.cos(nowSec * 39) * 2 };
	}
}
