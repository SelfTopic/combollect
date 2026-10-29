// Игра в браузере: цикл, отрисовка, ввод. Правила мира — только в core и content.

import { fractureZone, type LawKey, type MatchOptions } from "@combollect/content";
import {
	type Entity,
	hasTag,
	slotDef,
	TICKS_PER_SECOND,
	type Vec2,
	WORLD_DT,
} from "@combollect/core";
import { ZONE_NAMES } from "@combollect/journal";
import { type Application, Container } from "pixi.js";
import { byId } from "../ui/dom.ts";
import { showEnd } from "../ui/end.ts";
import { renderHud } from "../ui/hud.ts";
import { JournalFeed } from "../ui/journal.ts";
import { showTags } from "../ui/tags.ts";
import { CellLayer } from "../view/cells.ts";
import { type AimView, CursorLayer } from "../view/cursor.ts";
import { EffectLayer } from "../view/effects.ts";
import { EntityLayer } from "../view/entities.ts";
import { fitArena, type Layout, screenToWorld, worldToScreen } from "../view/layout.ts";
import { readTime, TimeLayer } from "../view/time.ts";
import { castLaw, needsAim, rightClick } from "./commands.ts";
import { FixedStepper } from "./loop.ts";
import { entityAt } from "./pick.ts";
import { Session } from "./session.ts";
import { noEffectReason, targetsEntity } from "./targeting.ts";

const KEYS: Readonly<Record<string, LawKey>> = { KeyQ: "Q", KeyW: "W", KeyE: "E", KeyR: "R" };
const HUD_EVERY_SEC = 0.1;

interface Aim {
	readonly key: LawKey;
	readonly slot: number;
}

export class Game {
	private readonly root = new Container();
	private readonly cells = new CellLayer();
	private readonly entities = new EntityLayer();
	private readonly effects = new EffectLayer();
	private readonly time = new TimeLayer();
	private readonly cursorLayer = new CursorLayer();
	private session: Session | null = null;
	private journal: JournalFeed | null = null;
	private stepper = new FixedStepper(WORLD_DT);
	private layout: Layout = { scale: 1, offsetX: 0, offsetY: 0 };
	private aim: Aim | null = null;
	private mouse = { x: 0, y: 0 };
	private tabHeld = false;
	private paused = false;
	private ended = false;
	private hudClock = 0;
	private realSec = 0;

	constructor(
		private readonly app: Application,
		private readonly onAgain: () => void,
	) {
		this.root.addChild(
			this.cells.view,
			this.entities.view,
			this.effects.view,
			this.time.view,
			this.cursorLayer.view,
		);
		app.stage.addChild(this.root);
		app.ticker.add((ticker) => this.frame(ticker.deltaMS / 1000));
		this.bindInput();
	}

	start(options: MatchOptions): void {
		this.session = new Session(options);
		this.journal = new JournalFeed(this.session.world);
		this.stepper = new FixedStepper(WORLD_DT);
		this.aim = null;
		this.ended = false;
		this.paused = false;
		byId("game").classList.remove("hidden");
		this.exposeForTests();
	}

	private frame(frameSec: number): void {
		const session = this.session;
		if (session === null) return;
		this.realSec += frameSec;
		const world = session.world;
		if (!this.paused && !this.ended) {
			const ticks = this.stepper.advance(frameSec);
			for (let i = 0; i < ticks; i++) session.tick();
		}
		const events = session.takeEvents();
		this.journal?.consume(events);
		this.effects.consume(world, events, this.realSec);
		this.layout = fitArena(world.grid, this.app.screen.width, this.app.screen.height);
		const timeView = readTime(world);
		const shake = this.time.shake(timeView, this.realSec);
		this.root.scale.set(this.layout.scale);
		this.root.position.set(this.layout.offsetX + shake.x, this.layout.offsetY + shake.y);
		const alpha = this.paused ? 1 : this.stepper.alpha;
		this.cells.draw(world, this.realSec);
		const hero = session.selectedHero();
		this.entities.draw(world.entities.values(), {
			world,
			position: (e) => session.renderPosition(e, alpha),
			heroes: session.defs,
			selectedId: hero?.id ?? null,
			playerHeroes: session.heroes.map((h) => h.id),
			realSec: this.realSec,
		});
		this.effects.draw(this.realSec);
		this.time.draw(world, timeView, this.realSec);
		this.drawCursor();
		this.banner(timeView);
		this.hudClock -= frameSec;
		if (this.hudClock <= 0) {
			this.hudClock = HUD_EVERY_SEC;
			this.renderHud();
			this.journal?.render();
		}
		if (world.result !== null && !this.ended) {
			this.ended = true;
			this.renderHud();
			this.journal?.render();
			showEnd(world.result, session.match.playerTeam, this.onAgain);
		}
	}

	private mouseWorld(): Vec2 {
		return screenToWorld(this.layout, this.mouse.x, this.mouse.y);
	}

	private aimView(hero: Entity): AimView | null {
		const session = this.session;
		if (this.aim === null || session === null) return null;
		const slot = hero.laws[this.aim.slot];
		if (slot === undefined) return null;
		const law = slotDef(session.world, slot);
		const cursor = this.mouseWorld();
		const hovered = entityAt(session.world, cursor);
		const blocked = hovered !== null && targetsEntity(law) ? noEffectReason(law, hovered) : null;
		return {
			law,
			params: slot.params,
			bearer: hero,
			bearerAt: hero.position,
			cursor,
			hovered: targetsEntity(law) ? hovered : null,
			blocked,
		};
	}

	private drawCursor(): void {
		const session = this.session;
		const hero = session?.selectedHero();
		const hint = byId("hint");
		const canvas = this.app.canvas;
		if (session === undefined || session === null || hero === undefined) {
			this.cursorLayer.draw(null, null);
			hint.classList.add("hidden");
			return;
		}
		const aim = this.aimView(hero);
		const hovered = entityAt(session.world, this.mouseWorld());
		this.cursorLayer.draw(aim, hovered === null ? null : { entity: hovered, at: hovered.position });
		canvas.style.cursor =
			aim === null ? "default" : aim.blocked === null ? "crosshair" : "not-allowed";
		let text: string | null = null;
		let bad = false;
		if (aim !== null) {
			if (aim.blocked !== null) {
				text = `«${aim.law.name}» не подействует: ${aim.blocked}`;
				bad = true;
			} else if (aim.law.form === "melee" && aim.hovered === null) {
				text = `«${aim.law.name}»: наведите на цель`;
			} else if (
				aim.hovered !== null &&
				aim.law.form === "melee" &&
				hasTag(aim.hovered, "Limbs") &&
				aim.law.id === "L1-01"
			) {
				// Перелом: зона — по направлению удара (см. content/laws/fracture.ts).
				text = `«${aim.law.name}»: по зоне «${ZONE_NAMES[fractureZone(aim.hovered, aim.cursor)]}»`;
			} else {
				text = `«${aim.law.name}» — ЛКМ, куда; Shift — в план; Esc — отмена`;
			}
		}
		if (this.tabHeld) showTags(hovered, this.mouse.x, this.mouse.y);
		else showTags(null, 0, 0);
		if (text === null) {
			hint.classList.add("hidden");
			return;
		}
		hint.textContent = text;
		hint.classList.toggle("bad", bad);
		hint.style.left = `${this.mouse.x + 16}px`;
		hint.style.top = `${this.mouse.y - 30}px`;
		hint.classList.remove("hidden");
	}

	private banner(time: ReturnType<typeof readTime>): void {
		const parts: string[] = [];
		if (this.paused) parts.push("ПАУЗА (пробел)");
		if (time.preparing.length > 0) parts.push("⚠ Готовится закон времени — весь мир трещит");
		if (time.globalFactor === 0) parts.push("⏸ ВРЕМЯ ОСТАНОВЛЕНО для всех «во времени»");
		else if (time.globalFactor < 1) parts.push(`⧗ Время замедлено ×${time.globalFactor}`);
		const session = this.session;
		if (session !== null) parts.push(`${(session.world.tick / TICKS_PER_SECOND).toFixed(0)} с`);
		byId("banner").textContent = parts.join("   ·   ");
	}

	private renderHud(): void {
		const session = this.session;
		if (session === null) return;
		renderHud({
			world: session.world,
			heroes: session.heroes,
			defs: session.defs,
			selected: session.selected,
			aimingKey: this.aim?.key ?? null,
		});
	}

	private pressLaw(key: LawKey, queue: boolean): void {
		const session = this.session;
		const hero = session?.selectedHero();
		if (session === null || session === undefined || hero === undefined) return;
		const heroLaw = session.defs.get(hero.id)?.laws.find((l) => l.key === key);
		if (heroLaw === undefined) return;
		const slot = hero.laws.findIndex((s) => s.lawId === heroLaw.lawId);
		const def = hero.laws[slot];
		if (def === undefined) return;
		const law = slotDef(session.world, def);
		if (!needsAim(law)) {
			const result = castLaw(law, slot, hero.position, null);
			if (result.ok) session.command(result.action, queue);
			this.aim = null;
			return;
		}
		this.aim = { key, slot };
	}

	private leftClick(queue: boolean): void {
		const session = this.session;
		if (session === null) return;
		const point = this.mouseWorld();
		const hovered = entityAt(session.world, point);
		const hero = session.selectedHero();
		if (this.aim !== null && hero !== undefined) {
			const slot = hero.laws[this.aim.slot];
			if (slot === undefined) return;
			const result = castLaw(
				slotDef(session.world, slot),
				this.aim.slot,
				point,
				hovered?.id ?? null,
			);
			if (result.ok) {
				session.command(result.action, queue);
				this.aim = null;
			}
			return;
		}
		const own = hovered === null ? -1 : session.heroes.indexOf(hovered);
		if (own >= 0) session.select(own);
	}

	private rightClickAt(queue: boolean): void {
		const session = this.session;
		const hero = session?.selectedHero();
		if (session === null || session === undefined || hero === undefined) return;
		if (this.aim !== null) {
			this.aim = null;
			return;
		}
		const point = this.mouseWorld();
		const hovered = entityAt(session.world, point);
		session.command(rightClick(session.world, hero, point, hovered?.id ?? null), queue);
	}

	private bindInput(): void {
		const canvas = this.app.canvas;
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("mousemove", (e) => {
			const rect = canvas.getBoundingClientRect();
			this.mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		});
		canvas.addEventListener("mousedown", (e) => {
			if (this.ended) return;
			if (e.button === 0) this.leftClick(e.shiftKey);
			if (e.button === 2) this.rightClickAt(e.shiftKey);
		});
		byId("hud").addEventListener("click", (e) => {
			const target = (e.target as HTMLElement).closest<HTMLElement>("[data-hero],[data-key]");
			if (target === null || this.session === null) return;
			if (target.dataset.hero !== undefined) this.session.select(Number(target.dataset.hero));
			const key = target.dataset.key;
			if (key === "Q" || key === "W" || key === "E" || key === "R") this.pressLaw(key, e.shiftKey);
		});
		window.addEventListener("keydown", (e) => {
			if (this.session === null || this.ended) return;
			if (e.code === "Tab") {
				e.preventDefault();
				this.tabHeld = true;
				return;
			}
			if (e.code === "Space") {
				e.preventDefault();
				this.paused = !this.paused;
				return;
			}
			if (e.code === "Escape") this.aim = null;
			const digit = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
			if (digit >= 0) {
				this.session.select(digit);
				this.aim = null;
			}
			const key = KEYS[e.code];
			if (key !== undefined) this.pressLaw(key, e.shiftKey);
		});
		window.addEventListener("keyup", (e) => {
			if (e.code === "Tab") this.tabHeld = false;
		});
	}

	/** Для скриншотов и ручной отладки в браузере: только в режиме разработки. */
	private exposeForTests(): void {
		if (!import.meta.env.DEV) return;
		const game = this;
		Object.assign(window, {
			combollect: {
				get session() {
					return game.session;
				},
				toScreen: (p: Vec2) => {
					const rect = game.app.canvas.getBoundingClientRect();
					const s = worldToScreen(game.layout, p);
					return { x: s.x + rect.left, y: s.y + rect.top };
				},
				pause: (on: boolean) => {
					game.paused = on;
				},
			},
		});
	}
}
