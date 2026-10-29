// Немедленные изменения состояний и ресурсов. Каждое пишет событие с причиной.
// Законы зовут их через deliver.ts, чтобы остановленные сущности копили удары.

import { BODY_ZONES, type BodyZone, type Entity, type Wetness, type Wound } from "../entity.ts";
import type { Cause } from "../events.ts";
import {
	CONCUSSION_SEC,
	dryingTime,
	EVAPORATION_HEAT,
	IGNITION_TEMP,
	REGEN_WOUND_CLOSE_SEC,
	WET_COOLING_MULTIPLIER,
} from "../physics.ts";
import { add, type Vec2 } from "../units.ts";
import { emit, type World } from "../world.ts";

const DRIER: Readonly<Record<Wetness, Wetness>> = { soaked: "wet", wet: "dry", dry: "dry" };

export function setWetness(world: World, entity: Entity, wetness: Wetness, cause: Cause): void {
	const before = entity.state.wetness;
	if (before === wetness) return;
	entity.state.wetness = wetness;
	entity.state.evaporationHeat = 0;
	entity.state.dryingSec = dryingTime(wetness);
	emit(world, { kind: "wetness", target: entity.id, cause, before, after: wetness });
	updateBurning(world, entity, cause);
}

/**
 * Изменить температуру. Тепло сначала тратится на испарение воды, холод на мокром теле
 * действует вдвое сильнее. См. docs/05-interactions.md: «Пламя + Мокрый», «Стужа + Мокрый».
 */
export interface HeatOptions {
	/** Мелкое непрерывное изменение (см. GameEvent.minor). */
	readonly minor?: boolean;
	/** Возврат к норме собственным теплом тела или средой: вода тут ни при чём. */
	readonly relax?: boolean;
}

export function applyTemperature(
	world: World,
	entity: Entity,
	delta: number,
	cause: Cause,
	options: HeatOptions = {},
): void {
	const minor = options.minor === true || options.relax === true;
	let rest = delta;
	if (options.relax !== true && rest < 0 && entity.state.wetness !== "dry") {
		rest *= WET_COOLING_MULTIPLIER;
	}
	while (options.relax !== true && rest > 0 && entity.state.wetness !== "dry") {
		const absorbed = Math.min(rest, EVAPORATION_HEAT - entity.state.evaporationHeat);
		entity.state.evaporationHeat += absorbed;
		rest -= absorbed;
		if (entity.state.evaporationHeat >= EVAPORATION_HEAT - 1e-9) {
			setWetness(world, entity, DRIER[entity.state.wetness], cause);
		}
	}
	if (rest === 0) return;
	const before = entity.state.temperature;
	entity.state.temperature = before + rest;
	emit(world, {
		kind: "temperature",
		target: entity.id,
		cause,
		before,
		after: entity.state.temperature,
		...(minor ? { minor: true } : {}),
	});
	updateBurning(world, entity, cause);
}

export function canBurn(entity: Entity): boolean {
	return (
		entity.tags.has("Flammable") &&
		!entity.tags.has("Nonflammable") &&
		entity.state.wetness === "dry" &&
		entity.state.temperature >= IGNITION_TEMP
	);
}

export function updateBurning(world: World, entity: Entity, cause: Cause): void {
	const burning = canBurn(entity);
	if (burning === entity.state.burning) return;
	entity.state.burning = burning;
	emit(world, { kind: burning ? "ignited" : "extinguished", target: entity.id, cause });
}

export function applyDamage(
	world: World,
	entity: Entity,
	amount: number,
	cause: Cause,
	minor = false,
): void {
	if (amount <= 0) return;
	const res = entity.resources;
	const before = res.health;
	// Торс — тоже зона: хрупкое тело теряет и его целостность быстрее.
	res.health = Math.max(0, before - amount * entity.stats.fragility);
	syncTorso(entity);
	emit(world, {
		kind: "health",
		target: entity.id,
		cause,
		before,
		after: res.health,
		...(minor ? { minor: true } : {}),
	});
}

/** Торс — основа здоровья: его целостность = доля здоровья. ДОПУЩЕНИЕ, см. decisions.md. */
function syncTorso(entity: Entity): void {
	const body = entity.state.body;
	if (body === null) return;
	const { health, maxHealth } = entity.resources;
	body.torso = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
}

/** Урон зоне тела в процентах целостности. Удар в торс — это урон здоровью. */
export function applyZoneDamage(
	world: World,
	entity: Entity,
	zone: BodyZone,
	amountPct: number,
	cause: Cause,
	minor = false,
): void {
	const body = entity.state.body;
	if (body === null || amountPct <= 0) return;
	if (zone === "torso") {
		applyDamage(world, entity, (amountPct / 100) * entity.resources.maxHealth, cause, minor);
		return;
	}
	const before = body[zone];
	body[zone] = Math.max(0, before - amountPct * entity.stats.fragility);
	emit(world, {
		kind: "bodyZone",
		target: entity.id,
		cause,
		before,
		after: body[zone],
		note: zone,
		...(minor ? { minor: true } : {}),
	});
	// Голова 0% — сотрясение (docs/02-atoms.md, «Голова»). Каждый новый удар по разбитой голове
	// начинает сотрясение заново.
	if (zone === "head" && body.head === 0) {
		entity.state.concussionSec = CONCUSSION_SEC;
		emit(world, { kind: "concussion", target: entity.id, cause, after: CONCUSSION_SEC });
	}
}

export function applyVelocity(world: World, entity: Entity, delta: Vec2, cause: Cause): void {
	const before = entity.velocity;
	entity.velocity = add(before, delta);
	emit(world, { kind: "impulse", target: entity.id, cause, before, after: entity.velocity });
}

/** Лорная цена старения: максимум здоровья падает навсегда. */
export function applyAging(world: World, entity: Entity, pct: number, cause: Cause): void {
	const res = entity.resources;
	const before = res.maxHealth;
	res.maxHealth = before * (1 - pct / 100);
	res.health = Math.min(res.health, res.maxHealth);
	syncTorso(entity);
	emit(world, { kind: "maxHealth", target: entity.id, cause, before, after: res.maxHealth });
}

/** Лечение здоровья (а значит, и торса) — не выше максимума. */
export function applyHealing(
	world: World,
	entity: Entity,
	amount: number,
	cause: Cause,
	minor = false,
): void {
	const res = entity.resources;
	const before = res.health;
	const after = Math.min(res.maxHealth, before + amount);
	if (amount <= 0 || after === before) return;
	res.health = after;
	syncTorso(entity);
	emit(world, {
		kind: "health",
		target: entity.id,
		cause,
		before,
		after,
		...(minor ? { minor: true } : {}),
	});
}

/** Восстановить зоны тела (кроме торса — он следует за здоровьем). */
export function healZones(world: World, entity: Entity, pct: number, cause: Cause): void {
	const body = entity.state.body;
	if (body === null || pct <= 0) return;
	for (const zone of BODY_ZONES) {
		if (zone === "torso" || body[zone] >= 100) continue;
		const before = body[zone];
		body[zone] = Math.min(100, before + pct);
		emit(world, {
			kind: "bodyZone",
			target: entity.id,
			cause,
			before,
			after: body[zone],
			note: zone,
			minor: true,
		});
	}
}

/** Новая открытая рана. Кровоточить может только то, у чего есть кровь (`Blood`). */
export function applyWound(world: World, entity: Entity, wound: Wound, cause: Cause): void {
	if (!entity.tags.has("Blood")) return;
	const wounds = entity.state.wounds;
	const before = wounds.length;
	if (before === 0) entity.state.woundHealSec = REGEN_WOUND_CLOSE_SEC;
	wounds.push({ ...wound, cause });
	emit(world, { kind: "bleeding", target: entity.id, cause, before, after: wounds.length });
}

/** Закрыть раны: `count` самых старых, или все (прижигание). */
export function closeWounds(
	world: World,
	entity: Entity,
	cause: Cause,
	count = Number.POSITIVE_INFINITY,
	note?: string,
): void {
	const wounds = entity.state.wounds;
	const before = wounds.length;
	if (before === 0) return;
	wounds.splice(0, Math.min(before, count));
	entity.state.woundHealSec = REGEN_WOUND_CLOSE_SEC;
	emit(world, {
		kind: "bleeding",
		target: entity.id,
		cause,
		before,
		after: wounds.length,
		...(note !== undefined ? { note } : {}),
	});
}
