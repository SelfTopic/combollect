// Метки сущности с учётом временных: мокрая сущность — проводник (docs/02-atoms.md, «Влажность»).

import type { Entity } from "./entity.ts";
import { WATER_FREEZE_TEMP } from "./physics.ts";
import type { TagId } from "./tags.ts";

/**
 * Вода на теле проводит ток, пока она жидкая. Замёрзшая вода — лёд, а лёд не проводит
 * (docs/05-interactions.md, «Стужа + Лужа»). ДОПУЩЕНИЕ, см. docs/dev/decisions.md.
 */
export function hasLiquidWater(entity: Entity): boolean {
	return entity.state.wetness !== "dry" && entity.state.temperature > WATER_FREEZE_TEMP;
}

export function effectiveTags(entity: Entity): ReadonlySet<TagId> {
	if (!hasLiquidWater(entity) || entity.tags.has("Conductor")) return entity.tags;
	const tags = new Set(entity.tags);
	tags.add("Conductor");
	return tags;
}

export function hasTag(entity: Entity, tag: TagId): boolean {
	return effectiveTags(entity).has(tag);
}
