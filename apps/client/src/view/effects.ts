// Короткие эффекты по событиям мира. Цвет и форма — по уровню закона (docs/10-controls.md):
// плоть — красные брызги, механика — белые волны, время — золотая рябь.

import type { GameEvent, LawDef, Vec2, World } from "@combollect/core";
import { ZONE_NAMES } from "@combollect/journal";
import { Container, Graphics, Text } from "pixi.js";
import { BLOOD_COLOR, FROST_COLOR, TIER_COLORS, TIME_COLOR } from "./palette.ts";

type Shape =
	| { readonly kind: "ring"; readonly radius: number; readonly width: number }
	| { readonly kind: "splash"; readonly seed: number }
	| { readonly kind: "cone"; readonly dir: Vec2; readonly range: number }
	| { readonly kind: "slash"; readonly dir: Vec2 }
	| { readonly kind: "burst"; readonly radius: number };

interface Effect {
	readonly at: Vec2;
	readonly color: number;
	readonly bornSec: number;
	readonly durSec: number;
	readonly shape: Shape;
}

interface Floater {
	readonly text: Text;
	readonly bornSec: number;
	readonly at: Vec2;
}

const FLOAT_SEC = 1.4;

export class EffectLayer {
	readonly view = new Container();
	private readonly gfx = new Graphics();
	private readonly floaters: Floater[] = [];
	private effects: Effect[] = [];
	private readonly names = new Map<number, Vec2>();

	constructor() {
		this.view.addChild(this.gfx);
	}

	/** Превратить события тика в эффекты. */
	consume(world: World, events: readonly GameEvent[], nowSec: number): void {
		for (const ev of events) this.onEvent(world, ev, nowSec);
	}

	private where(world: World, ev: GameEvent): Vec2 | null {
		if (ev.at !== undefined) return ev.at;
		if (ev.target === undefined) return null;
		const entity = world.entities.get(ev.target);
		if (entity !== undefined) this.names.set(ev.target, entity.position);
		return entity?.position ?? this.names.get(ev.target) ?? null;
	}

	private onEvent(world: World, ev: GameEvent, now: number): void {
		if (ev.minor === true) return;
		const at = this.where(world, ev);
		if (at === null) return;
		switch (ev.kind) {
			case "lawApplied": {
				const law = ev.cause.lawId === undefined ? undefined : world.laws.get(ev.cause.lawId);
				const bearer = ev.target === undefined ? undefined : world.entities.get(ev.target);
				if (law !== undefined && bearer !== undefined) this.lawShape(law, bearer.position, at, now);
				return;
			}
			case "health": {
				const lost = Number(ev.before) - Number(ev.after);
				if (lost >= 1) this.float(`−${Math.round(lost)}`, at, 0xffffff, now);
				return;
			}
			case "bodyZone": {
				const lost = Number(ev.before) - Number(ev.after);
				if (lost <= 0) return;
				const zone = ZONE_NAMES[(ev.note ?? "legs") as keyof typeof ZONE_NAMES] ?? ev.note;
				const broken = Number(ev.after) <= 0;
				this.float(
					broken ? `${zone} сломаны!` : `${zone} −${Math.round(lost)}%`,
					at,
					0xff5252,
					now,
					18,
				);
				this.add(at, BLOOD_COLOR, now, 0.5, { kind: "splash", seed: ev.tick });
				return;
			}
			case "bleeding": {
				const opened = Number(ev.after) > Number(ev.before);
				if (opened) {
					this.add(at, TIER_COLORS[1], now, 0.7, { kind: "splash", seed: ev.tick + 7 });
					this.float("кровотечение", at, 0xff6b6b, now, 30);
				} else if (ev.note === "прижигание") {
					this.add(at, 0xff8a1f, now, 0.8, { kind: "burst", radius: 30 });
					this.float("прижигание", at, 0xffb060, now, 30);
				}
				return;
			}
			case "hitsReleased":
				this.add(at, TIME_COLOR, now, 0.6, { kind: "ring", radius: 40, width: 4 });
				return;
			case "projectileHit":
				this.add(at, 0xffffff, now, 0.3, { kind: "burst", radius: 10 });
				return;
			case "death":
				this.add(at, 0x999999, now, 1, { kind: "ring", radius: 50, width: 3 });
				this.float("погиб", at, 0xbbbbbb, now, 26);
				return;
			case "concussion":
				this.float("сотрясение", at, 0xffee33, now, 40);
				return;
			case "ignited":
				this.float("горит", at, 0xff8a1f, now, 40);
				return;
			case "timeFieldAdded":
				if (ev.note === "Временной шрам") return;
				this.add(at, TIME_COLOR, now, 1.4, { kind: "ring", radius: 1400, width: 6 });
				return;
			default:
				return;
		}
	}

	private lawShape(law: LawDef, from: Vec2, at: Vec2, now: number): void {
		const color = law.id === "L3-02" ? FROST_COLOR : TIER_COLORS[law.tier];
		const dx = at.x - from.x;
		const dy = at.y - from.y;
		const len = Math.hypot(dx, dy) || 1;
		const dir = { x: dx / len, y: dy / len };
		switch (law.form) {
			case "global":
				this.add(from, color, now, 1.2, { kind: "ring", radius: 1400, width: 8 });
				return;
			case "cone":
				this.add(from, color, now, 0.45, {
					kind: "cone",
					dir,
					range: law.params.coneRangeUnits ?? 150,
				});
				return;
			case "melee":
				this.add(at, color, now, 0.35, { kind: "slash", dir });
				if (law.tier === 1)
					this.add(at, color, now, 0.6, { kind: "splash", seed: Math.round(at.x) });
				return;
			case "point":
				this.add(at, color, now, 0.6, { kind: "burst", radius: law.params.radiusUnits ?? 32 });
				return;
			case "projectile":
				this.add(from, color, now, 0.25, { kind: "burst", radius: 14 });
				return;
		}
	}

	private add(at: Vec2, color: number, now: number, durSec: number, shape: Shape): void {
		this.effects.push({ at, color, bornSec: now, durSec, shape });
	}

	private float(label: string, at: Vec2, color: number, now: number, lift = 22): void {
		const text = new Text({
			text: label,
			style: {
				fontFamily: "Arial",
				fontSize: 15,
				fontWeight: "bold",
				fill: color,
				stroke: { color: 0x000000, width: 3 },
			},
			resolution: 2,
		});
		text.anchor.set(0.5);
		this.view.addChild(text);
		this.floaters.push({ text, bornSec: now, at: { x: at.x, y: at.y - lift } });
	}

	draw(now: number): void {
		const g = this.gfx;
		g.clear();
		this.effects = this.effects.filter((e) => now - e.bornSec < e.durSec);
		for (const e of this.effects) this.drawEffect(g, e, (now - e.bornSec) / e.durSec);
		for (let i = this.floaters.length - 1; i >= 0; i--) {
			const f = this.floaters[i];
			if (f === undefined) continue;
			const k = (now - f.bornSec) / FLOAT_SEC;
			if (k >= 1) {
				f.text.destroy();
				this.floaters.splice(i, 1);
				continue;
			}
			f.text.position.set(f.at.x, f.at.y - k * 26);
			f.text.alpha = 1 - k * k;
		}
	}

	private drawEffect(g: Graphics, e: Effect, k: number): void {
		const alpha = 1 - k;
		const { at, color, shape } = e;
		switch (shape.kind) {
			case "ring":
				g.circle(at.x, at.y, Math.max(1, shape.radius * k)).stroke({
					width: shape.width,
					color,
					alpha,
				});
				return;
			case "burst":
				g.circle(at.x, at.y, shape.radius * (0.4 + 0.6 * k)).fill({ color, alpha: alpha * 0.45 });
				return;
			case "splash":
				for (let i = 0; i < 7; i++) {
					const a = ((shape.seed * 37 + i * 53) % 360) * (Math.PI / 180);
					const d = 6 + 20 * k * (0.6 + ((i * 13) % 5) / 10);
					g.circle(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 2.5 * (1 - k * 0.5)).fill({
						color,
						alpha,
					});
				}
				return;
			case "slash": {
				const n = { x: -shape.dir.y, y: shape.dir.x };
				g.moveTo(at.x - n.x * 14, at.y - n.y * 14)
					.quadraticCurveTo(
						at.x - shape.dir.x * 8,
						at.y - shape.dir.y * 8,
						at.x + n.x * 14,
						at.y + n.y * 14,
					)
					.stroke({ width: 4, color, alpha });
				return;
			}
			case "cone": {
				const half = Math.PI / 4;
				const base = Math.atan2(shape.dir.y, shape.dir.x);
				const r = shape.range * (0.3 + 0.7 * k);
				g.moveTo(at.x, at.y)
					.arc(at.x, at.y, r, base - half, base + half)
					.lineTo(at.x, at.y)
					.fill({ color, alpha: alpha * 0.25 });
				g.arc(at.x, at.y, r, base - half, base + half).stroke({ width: 3, color, alpha });
				return;
			}
		}
	}
}
