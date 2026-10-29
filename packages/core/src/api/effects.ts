// Немедленные изменения состояний и ресурсов. Каждое пишет событие с причиной.
// Законы зовут их через deliver.ts, чтобы остановленные сущности копили удары.

import type { BodyZone, Entity, Wetness } from "../entity.ts";
import type { Cause } from "../events.ts";
import {
	CONCUSSION_SEC,
	dryingTime,
	EVAPORATION_HEAT,
	IGNITION_TEMP,
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
	res.health = Math.max(0, before - amount);
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
	body[zone] = Math.max(0, before - amountPct);
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
