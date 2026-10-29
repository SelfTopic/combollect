// Доставка изменений с учётом остановленного времени.
// docs/06-time-system.md, правило 2: удар по остановленной цели записывается и применяется
// разом в момент возобновления. ДОПУЩЕНИЕ: так же копится и тепло/холод — «энергия передаётся,
// но время не идёт» (docs/05-interactions.md). См. docs/dev/decisions.md.

import {
	type BodyZone,
	type Entity,
	isStopped,
	type PendingEffect,
	type Wound,
} from "../entity.ts";
import type { Cause } from "../events.ts";
import { GROUND_DECELERATION } from "../physics.ts";
import { massFactor } from "../tags.ts";
import { normalize, scale, type Units, type Vec2 } from "../units.ts";
import { emit, type World } from "../world.ts";
import {
	applyDamage,
	applyTemperature,
	applyVelocity,
	applyWound,
	applyZoneDamage,
} from "./effects.ts";

function applyEffect(world: World, entity: Entity, effect: PendingEffect, cause: Cause): void {
	switch (effect.kind) {
		case "damage":
			applyDamage(world, entity, effect.amount, cause);
			return;
		case "zone":
			applyZoneDamage(world, entity, effect.zone, effect.amountPct, cause);
			return;
		case "velocity":
			applyVelocity(world, entity, effect.delta, cause);
			return;
		case "temperature":
			applyTemperature(world, entity, effect.delta, cause);
			return;
		case "wound":
			applyWound(world, entity, effect.wound, cause);
			return;
	}
}

export function deliver(world: World, entity: Entity, effect: PendingEffect, cause: Cause): void {
	if (!isStopped(entity)) {
		applyEffect(world, entity, effect, cause);
		return;
	}
	entity.state.pending.push({
		effect,
		...(cause.lawId !== undefined ? { lawId: cause.lawId } : {}),
		...(cause.sourceId !== undefined ? { sourceId: cause.sourceId } : {}),
	});
	emit(world, { kind: "hitStored", target: entity.id, cause, note: effect.kind });
}

/** Применить всё накопленное разом. Зовётся, когда время сущности снова пошло. */
export function releasePending(world: World, entity: Entity): void {
	const pending = entity.state.pending.splice(0);
	if (pending.length === 0) return;
	emit(world, {
		kind: "hitsReleased",
		target: entity.id,
		cause: { system: "clock" },
		after: pending.length,
	});
	for (const hit of pending) {
		const cause: Cause = {
			...(hit.lawId !== undefined ? { lawId: hit.lawId } : {}),
			...(hit.sourceId !== undefined ? { sourceId: hit.sourceId } : {}),
		};
		applyEffect(world, entity, hit.effect, cause);
	}
}

export function damage(world: World, entity: Entity, amount: number, cause: Cause): void {
	deliver(world, entity, { kind: "damage", amount }, cause);
}

export function damageZone(
	world: World,
	entity: Entity,
	zone: BodyZone,
	amountPct: number,
	cause: Cause,
): void {
	deliver(world, entity, { kind: "zone", zone, amountPct }, cause);
}

/** Нанести рану. Рана остановленному тоже ждёт: кровь пойдёт, когда пойдут его часы. */
export function wound(world: World, entity: Entity, w: Wound, cause: Cause): void {
	deliver(world, entity, { kind: "wound", wound: w }, cause);
}

export function changeTemperature(world: World, entity: Entity, delta: number, cause: Cause): void {
	deliver(world, entity, { kind: "temperature", delta }, cause);
}

/**
 * Толчок. Дистанция отбрасывания обратно пропорциональна массе (docs/04-laws-catalog.md, L2-01):
 * начальная скорость подбирается так, чтобы на обычной земле тело массы «средняя» пролетело
 * `distance`. На льду торможение слабее — тело летит дальше само.
 */
export function push(
	world: World,
	entity: Entity,
	direction: Vec2,
	distance: Units,
	cause: Cause,
): void {
	const speed = Math.sqrt((2 * GROUND_DECELERATION * distance) / massFactor(entity.tags));
	deliver(world, entity, { kind: "velocity", delta: scale(normalize(direction), speed) }, cause);
}

/** Передать скорость напрямую (столкновения). */
export function addVelocity(world: World, entity: Entity, delta: Vec2, cause: Cause): void {
	deliver(world, entity, { kind: "velocity", delta }, cause);
}
