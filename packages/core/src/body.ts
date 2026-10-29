// Последствия состояния тела: «бумажная кукла» и обморожение. См. docs/02-atoms.md, раздел 2.
// Точные числа — ДОПУЩЕНИЯ, см. docs/dev/decisions.md.

import type { Entity } from "./entity.ts";
import { FROSTBITE_TEMP, LIMB_FREEZE_TEMP } from "./physics.ts";

const HALF = 50;
/** Ноги < 50%: медленнее. */
const HURT_LEGS_SPEED = 0.6;
/** Ноги сломаны: только ползком, 30% скорости. */
const CRAWL_SPEED = 0.3;
/** Обморожение снижает скорость пропорционально: от 100% при −10° до 50% при −30°. */
const DEEP_FROSTBITE_SPEED = 0.5;
const SLOW_FACTOR = 0.5;

export function speedFactor(entity: Entity): number {
	let factor = 1;
	const body = entity.state.body;
	if (body !== null) {
		if (body.legs <= 0) factor *= CRAWL_SPEED;
		else if (body.legs < HALF) factor *= HURT_LEGS_SPEED;
	}
	const t = entity.state.temperature;
	if (entity.tags.has("WarmBlooded") && t < FROSTBITE_TEMP) {
		const depth = Math.min(1, (FROSTBITE_TEMP - t) / (FROSTBITE_TEMP - LIMB_FREEZE_TEMP));
		factor *= 1 - depth * (1 - DEEP_FROSTBITE_SPEED);
	}
	return factor;
}

/** Голова < 50%: подготовка законов идёт медленнее. */
export function castFactor(entity: Entity): number {
	const body = entity.state.body;
	return body !== null && body.head < HALF ? SLOW_FACTOR : 1;
}

/** Руки < 50%: атака медленнее. */
export function attackFactor(entity: Entity): number {
	const body = entity.state.body;
	return body !== null && body.arms < HALF ? SLOW_FACTOR : 1;
}

/** Жест возможен, только если есть руки и они не сломаны. */
export function canGesture(entity: Entity): boolean {
	const body = entity.state.body;
	return body !== null && body.arms > 0;
}

export function isConcussed(entity: Entity): boolean {
	return entity.state.concussionSec > 0;
}
