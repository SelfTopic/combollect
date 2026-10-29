// Сущности: простые фигуры без спрайтов. Цвет тускнеет вместе с часами сущности.

import type { HeroDef } from "@combollect/content";
import {
	type Entity,
	type EntityId,
	isAlive,
	length,
	slotDef,
	type Vec2,
	type World,
	windupOf,
} from "@combollect/core";
import { Container, Graphics, Text } from "pixi.js";
import {
	BLOOD_COLOR,
	desaturate,
	integrityColor,
	NEUTRAL_RING,
	TEAM_COLORS,
	TIER_COLORS,
	TIME_COLOR,
} from "./palette.ts";

const HERO_LOOKS: Readonly<Record<string, { color: number; letter: string }>> = {
	chronist: { color: 0xc8a46a, letter: "Х" },
	shadow: { color: 0x40405a, letter: "Т" },
	butcher: { color: 0x9a5532, letter: "М" },
};

interface Sprite {
	readonly root: Container;
	readonly body: Graphics;
	readonly overlay: Graphics;
	readonly label: Text;
	readonly info: Text;
}

export interface EntityPaint {
	readonly world: World;
	readonly position: (entity: Entity) => Vec2;
	readonly heroes: ReadonlyMap<EntityId, HeroDef>;
	readonly selectedId: EntityId | null;
	readonly playerHeroes: readonly EntityId[];
	readonly realSec: number;
}

function text(size: number, color: number): Text {
	return new Text({
		text: "",
		style: {
			fontFamily: "Arial",
			fontSize: size,
			fill: color,
			fontWeight: "bold",
			stroke: { color: 0x000000, width: 3 },
		},
		resolution: 2,
	});
}

export class EntityLayer {
	readonly view = new Container();
	private readonly sprites = new Map<EntityId, Sprite>();

	draw(entities: Iterable<Entity>, paint: EntityPaint): void {
		const alive = new Set<EntityId>();
		for (const entity of entities) {
			if (!isAlive(entity)) continue;
			alive.add(entity.id);
			const sprite = this.sprites.get(entity.id) ?? this.create(entity.id);
			const p = paint.position(entity);
			sprite.root.position.set(p.x, p.y);
			this.paint(entity, sprite, paint);
		}
		for (const [id, sprite] of this.sprites) {
			if (alive.has(id)) continue;
			sprite.root.destroy({ children: true });
			this.sprites.delete(id);
		}
	}

	private create(id: EntityId): Sprite {
		const root = new Container();
		const body = new Graphics();
		const overlay = new Graphics();
		const label = text(15, 0xffffff);
		label.anchor.set(0.5);
		const info = text(13, TIME_COLOR);
		info.anchor.set(0.5, 0);
		root.addChild(body, label, overlay, info);
		this.view.addChild(root);
		const sprite = { root, body, overlay, label, info };
		this.sprites.set(id, sprite);
		return sprite;
	}

	private paint(e: Entity, s: Sprite, paint: EntityPaint): void {
		const g = s.body;
		const o = s.overlay;
		g.clear();
		o.clear();
		s.label.text = "";
		s.info.text = "";
		const rate = e.clock.rate;
		const r = e.stats.radiusUnits;
		if (e.tags.has("Projectile")) {
			this.paintKnife(e, g, rate);
		} else if (e.tags.has("Structure")) {
			this.paintThrone(e, g, rate);
		} else if (e.name === "Дерево") {
			const canopy = e.state.burning ? 0xd0641c : 0x2d6a2a;
			g.circle(0, 0, r).fill(desaturate(canopy, rate)).stroke({ width: 2, color: 0x173d16 });
			g.circle(-r * 0.3, -r * 0.3, r * 0.45).fill({
				color: desaturate(0x3f8a38, rate),
				alpha: 0.8,
			});
		} else if (e.tags.has("Terrain")) {
			g.circle(0, 0, r).fill(desaturate(0x77736b, rate)).stroke({ width: 2, color: 0x3c3a36 });
			g.circle(-r * 0.3, -r * 0.35, r * 0.35).fill({ color: 0x9a968c, alpha: 0.8 });
		} else {
			this.paintCreature(e, s, paint, rate);
		}
		if (e.state.burning) this.paintFlames(o, r, paint.realSec);
		this.paintWindup(e, o, r, paint.world);
		this.paintPending(e, s, r);
	}

	private paintKnife(e: Entity, g: Graphics, rate: number): void {
		const v = e.velocity;
		const len = length(v);
		const dir = len > 0 ? { x: v.x / len, y: v.y / len } : { x: 1, y: 0 };
		if (rate === 0) {
			// Застывший нож: золотой ореол — «висит» (docs/06-time-system.md, правило 1).
			g.circle(0, 0, 11)
				.fill({ color: TIME_COLOR, alpha: 0.25 })
				.stroke({ width: 1.5, color: TIME_COLOR });
		}
		const steel = desaturate(0xdfe6f0, rate);
		g.moveTo(-dir.x * 9, -dir.y * 9)
			.lineTo(dir.x * 9, dir.y * 9)
			.stroke({ width: 3, color: steel });
		g.circle(dir.x * 9, dir.y * 9, 2).fill(0xffffff);
		g.moveTo(-dir.x * 9, -dir.y * 9)
			.lineTo(-dir.x * 5, -dir.y * 5)
			.stroke({ width: 4, color: desaturate(0x5a3a22, rate) });
	}

	private paintThrone(e: Entity, g: Graphics, rate: number): void {
		const r = e.stats.radiusUnits;
		const team = e.team === null ? NEUTRAL_RING : (TEAM_COLORS[e.team] ?? NEUTRAL_RING);
		g.roundRect(-r, -r, r * 2, r * 2, 8)
			.fill(desaturate(0x4a4038, rate))
			.stroke({ width: 4, color: team });
		// Корона — чтобы трон читался как цель матча.
		g.poly([
			-r * 0.55,
			r * 0.25,
			-r * 0.55,
			-r * 0.35,
			-r * 0.25,
			-r * 0.05,
			0,
			-r * 0.5,
			r * 0.25,
			-r * 0.05,
			r * 0.55,
			-r * 0.35,
			r * 0.55,
			r * 0.25,
		]).fill(desaturate(0xe8c64a, rate));
		this.healthBar(g, e, r * 2.2, -r - 14);
	}

	private paintCreature(e: Entity, s: Sprite, paint: EntityPaint, rate: number): void {
		const g = s.body;
		const r = e.stats.radiusUnits;
		const hero = paint.heroes.get(e.id);
		const look = hero === undefined ? undefined : HERO_LOOKS[hero.id];
		// Кольцо команды — пометка интерфейса, а не тело: оно не тускнеет, когда время стоит.
		const team = e.team === null ? NEUTRAL_RING : (TEAM_COLORS[e.team] ?? NEUTRAL_RING);
		if (paint.selectedId === e.id) {
			g.circle(0, 0, r + 8).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
		}
		g.circle(0, 0, r)
			.fill(desaturate(look?.color ?? 0x8c7a66, rate))
			.stroke({ width: 4, color: team });
		s.label.text = look?.letter ?? "";
		s.label.style.fill = desaturate(0xffffff, rate);
		const slot = paint.playerHeroes.indexOf(e.id);
		this.healthBar(g, e, 40, -r - 16);
		this.miniDoll(g, e, r);
		if (e.state.wounds.length > 0) {
			for (let i = 0; i < Math.min(5, e.state.wounds.length); i++) {
				g.circle(-r - 4, -r + 6 + i * 6, 2.6).fill(BLOOD_COLOR);
			}
		}
		if (e.state.wetness !== "dry") {
			g.circle(r + 3, r - 2, 3.5).fill({
				color: 0x4aa3ff,
				alpha: e.state.wetness === "soaked" ? 1 : 0.6,
			});
		}
		if (e.state.concussionSec > 0) s.info.text = "✦ сотрясение";
		else if (rate !== 1 && e.tags.has("Hero")) s.info.text = `⧗×${rate}`;
		s.info.position.set(0, r + 12);
		if (slot >= 0) {
			s.info.text = `${slot + 1}${s.info.text === "" ? "" : `  ${s.info.text}`}`;
		}
	}

	/** Маленькая «бумажная кукла» под полоской здоровья: видно, что сломано у врага. */
	private miniDoll(g: Graphics, e: Entity, r: number): void {
		const body = e.state.body;
		if (body === null) return;
		const y = -r - 10;
		g.rect(-19, y, 9, 4).fill(integrityColor(body.head));
		g.rect(-8, y, 9, 4).fill(integrityColor(body.arms));
		g.rect(3, y, 16, 4).fill(integrityColor(body.legs));
	}

	private healthBar(g: Graphics, e: Entity, width: number, y: number): void {
		const { health, maxHealth } = e.resources;
		const k = maxHealth > 0 ? Math.max(0, health / maxHealth) : 0;
		g.rect(-width / 2, y, width, 5).fill(0x111111);
		g.rect(-width / 2, y, width * k, 5).fill(k > 0.5 ? 0x4caf50 : k > 0.25 ? 0xf0c419 : 0xe53935);
	}

	private paintFlames(o: Graphics, r: number, realSec: number): void {
		const lift = Math.sin(realSec * 18) * 3;
		o.poly([-r * 0.6, -r * 0.2, -r * 0.3, -r - 8 - lift, 0, -r * 0.2]).fill({
			color: 0xff7a00,
			alpha: 0.9,
		});
		o.poly([0, -r * 0.2, r * 0.35, -r - 4 + lift, r * 0.65, -r * 0.2]).fill({
			color: 0xffc400,
			alpha: 0.9,
		});
	}

	/** Подготовка закона видна всем: дуга цвета уровня закона заполняется по ходу замаха. */
	private paintWindup(e: Entity, o: Graphics, r: number, world: World): void {
		const windup = e.state.windup;
		if (windup === null) return;
		const slot = e.laws[windup.slot];
		if (slot === undefined) return;
		const def = slotDef(world, slot);
		const total = windupOf(def, slot);
		const k = total > 0 ? 1 - windup.remainingSec / total : 1;
		const color = TIER_COLORS[def.tier];
		o.circle(0, 0, r + 5).stroke({ width: 2, color, alpha: 0.35 });
		o.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).stroke({ width: 4, color });
	}

	private paintPending(e: Entity, s: Sprite, r: number): void {
		const pending = e.state.pending;
		if (pending.length === 0) return;
		// Над остановленной целью видна копящаяся цифра (docs/06-time-system.md, правило 2).
		const sum = pending.reduce(
			(acc, hit) => acc + (hit.effect.kind === "damage" ? hit.effect.amount : 0),
			0,
		);
		s.info.text = `⏸ ${Math.round(sum)} урона ждёт`;
		s.info.position.set(0, -r - 34);
	}
}
