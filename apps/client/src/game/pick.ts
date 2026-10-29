// Что под курсором: ближайшая живая сущность, в чьё тело попадает точка.

import { distance, type Entity, isAlive, type Vec2, type World } from "@combollect/core";

const SLACK_UNITS = 6;

export function entityAt(world: World, point: Vec2): Entity | null {
	let best: Entity | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	for (const entity of world.entities.values()) {
		if (!isAlive(entity)) continue;
		const d = distance(entity.position, point);
		const reach = entity.stats.radiusUnits + SLACK_UNITS;
		if (d > reach) continue;
		// Снаряды тонкие — выбираем их, только если больше ничего нет.
		const score = d / reach + (entity.tags.has("Projectile") ? 1 : 0);
		if (score < bestScore) {
			best = entity;
			bestScore = score;
		}
	}
	return best;
}
