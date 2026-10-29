// Интерфейс героя (docs/10-controls.md, «Что игрок видит»): бумажная кукла, здоровье,
// лорный ресурс, температура, влажность, законы с перезарядкой, текущий план.

import type { HeroDef, LawKey } from "@combollect/content";
import {
	canGesture,
	describeAction,
	type Entity,
	isAlive,
	isConcussed,
	slotDef,
	type World,
} from "@combollect/core";
import { WETNESS_NAMES } from "@combollect/journal";
import { cssColor, integrityColor, TIER_COLORS } from "../view/palette.ts";
import { byId, escapeHtml } from "./dom.ts";

export interface HudModel {
	readonly world: World;
	readonly heroes: readonly Entity[];
	readonly defs: ReadonlyMap<number, HeroDef>;
	readonly selected: number;
	readonly aimingKey: LawKey | null;
}

function meter(name: string, value: string, k: number, color: string): string {
	const w = Math.max(0, Math.min(1, k)) * 100;
	return `<div class="stat"><span class="name">${name}</span><span class="meter"><i class="fill" style="width:${w}%;background:${color}"></i></span><span>${value}</span></div>`;
}

/** Бумажная кукла: 4 зоны, цвет — целостность. */
function doll(hero: Entity): string {
	const body = hero.state.body;
	if (body === null) return "";
	const c = (pct: number) => cssColor(integrityColor(pct));
	const pct = (v: number) => `${Math.round(v)}%`;
	return `<div class="doll"><svg width="84" height="120" viewBox="0 0 84 120">
		<circle cx="42" cy="15" r="11" fill="${c(body.head)}"/>
		<rect x="28" y="29" width="28" height="40" rx="4" fill="${c(body.torso)}"/>
		<rect x="14" y="30" width="11" height="36" rx="4" fill="${c(body.arms)}"/>
		<rect x="59" y="30" width="11" height="36" rx="4" fill="${c(body.arms)}"/>
		<rect x="29" y="72" width="11" height="44" rx="4" fill="${c(body.legs)}"/>
		<rect x="44" y="72" width="11" height="44" rx="4" fill="${c(body.legs)}"/>
	</svg><div>Г ${pct(body.head)} · Р ${pct(body.arms)}</div><div>Т ${pct(body.torso)} · Н ${pct(body.legs)}</div></div>`;
}

/** Почему закон сейчас нельзя применить — коротко, для кнопки. */
function blockReason(world: World, hero: Entity, slotIndex: number): string | null {
	const slot = hero.laws[slotIndex];
	if (slot === undefined) return null;
	const def = slotDef(world, slot);
	if (isConcussed(hero)) return "сотрясение";
	if (def.gesture && !canGesture(hero)) return "руки сломаны";
	if (def.cost.resource > (hero.resources.lore?.value ?? 0))
		return `мало: ${hero.resources.lore?.name ?? "ресурс"}`;
	if (hero.clock.rate === 0) return "время стоит: в план";
	return null;
}

function laws(model: HudModel, hero: Entity): string {
	const def = model.defs.get(hero.id);
	if (def === undefined) return "";
	return def.laws
		.map((heroLaw) => {
			const slotIndex = hero.laws.findIndex((s) => s.lawId === heroLaw.lawId);
			const slot = hero.laws[slotIndex];
			if (slot === undefined) return "";
			const law = slotDef(model.world, slot);
			const color = cssColor(TIER_COLORS[law.tier]);
			const key = heroLaw.key ?? "ПКМ";
			const cost =
				law.cost.resource > 0
					? `${law.cost.resource} ${hero.resources.lore?.name ?? ""}`
					: "бесплатно";
			const aging =
				law.cost.lore === null ? "" : ` · старение −${law.cost.lore.agingMaxHealthPct}%`;
			const cd = slot.cooldownSec > 0 ? `<div class="cd">${slot.cooldownSec.toFixed(1)}</div>` : "";
			const why = blockReason(model.world, hero, slotIndex);
			const temp =
				heroLaw.temporary === undefined
					? ""
					: `<span class="temp" title="${escapeHtml(heroLaw.temporary)}">временно</span>`;
			const aiming = model.aimingKey !== null && model.aimingKey === heroLaw.key ? " aiming" : "";
			return `<div class="law${aiming}" data-key="${heroLaw.key ?? ""}" style="border-color:${color}">
				${temp}<div class="key" style="color:${color}">${key}</div>
				<div class="lname">${escapeHtml(law.name)}</div>
				<div class="meta">ур. ${law.tier} · ${escapeHtml(cost)}${aging}</div>
				${cd}${why === null ? "" : `<div class="why">${escapeHtml(why)}</div>`}</div>`;
		})
		.join("");
}

function stats(hero: Entity): string {
	const { health, maxHealth, lore } = hero.resources;
	const t = hero.state.temperature;
	const tColor = t > 10 ? "#ff7a00" : t < -10 ? "#7fd6ff" : "#c8c8c8";
	const parts = [
		meter(
			"Здоровье",
			`${Math.round(health)}/${Math.round(maxHealth)}`,
			health / Math.max(1, maxHealth),
			"#4caf50",
		),
		lore === null
			? ""
			: meter(
					lore.name,
					`${Math.floor(lore.value)}/${lore.max}`,
					lore.value / Math.max(1, lore.max),
					"#e0b03a",
				),
		meter("Температура", `${t > 0 ? "+" : ""}${t.toFixed(0)}°`, (t + 40) / 80, tColor),
		`<div class="stat"><span class="name">Влажность</span>${WETNESS_NAMES[hero.state.wetness]}</div>`,
		`<div class="stat"><span class="name">Раны</span>${hero.state.wounds.length === 0 ? "нет" : `🩸 ${hero.state.wounds.length} (кровь течёт при ходьбе)`}</div>`,
		`<div class="stat"><span class="name">Часы</span>×${hero.clock.rate}${hero.clock.rate === 0 ? " — время стоит" : ""}</div>`,
	];
	return parts.join("");
}

export function renderHud(model: HudModel): void {
	const tabs = model.heroes
		.map((h, i) => {
			const k = Math.max(0, h.resources.health / Math.max(1, h.resources.maxHealth));
			const cls = `hero-tab${i === model.selected ? " on" : ""}${isAlive(h) ? "" : " dead"}`;
			return `<button class="${cls}" data-hero="${i}">${i + 1} · ${escapeHtml(h.name)}<div class="bar"><i style="width:${k * 100}%"></i></div></button>`;
		})
		.join("");
	const hero = model.heroes[model.selected];
	const body =
		hero === undefined || !isAlive(hero)
			? `<div class="stats">Герой погиб. Выберите другого (1, 2, 3).</div>`
			: `${doll(hero)}<div class="stats">${stats(hero)}</div><div class="laws">${laws(model, hero)}</div>`;
	byId("hud").innerHTML = `<div class="heroes">${tabs}</div>${body}`;
	const plan = hero === undefined ? [] : hero.plan;
	byId("plan").innerHTML =
		plan.length === 0
			? `<span style="color:#9aa3ab">пусто</span>`
			: `<ol>${plan.map((a) => `<li>${escapeHtml(describeAction(model.world, hero as Entity, a))}</li>`).join("")}</ol>`;
}
