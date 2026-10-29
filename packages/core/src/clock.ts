// Часы каждой сущности. См. docs/06-time-system.md и docs/dev/architecture.md, «Часы».

import { releasePending } from "./api/deliver.ts";
import { type Entity, isAlive } from "./entity.ts";
import { effectiveTags } from "./entityTags.ts";
import type { Cause } from "./events.ts";
import { cellCenter } from "./grid.ts";
import type { TimeFieldSpec } from "./law.ts";
import { excludedBy, matchesQuery, type TagId } from "./tags.ts";
import { distance, type EntityId, type Vec2, WORLD_DT } from "./units.ts";
import { emit, entitiesInOrder, type TimeField, type World } from "./world.ts";

/**
 * Карта тоже во времени: огонь на траве и лёд на земле живут по часам клетки.
 * ДОПУЩЕНИЕ, см. docs/dev/decisions.md.
 */
const MAP_TAGS: ReadonlySet<TagId> = new Set<TagId>([
	"Material",
	"Terrain",
	"InTime",
	"InSpace",
	"Atomic",
]);

function inArea(field: TimeField, point: Vec2): boolean {
	return field.area === null || distance(field.area.center, point) <= field.area.radiusUnits;
}

/**
 * Действует ли поле на сущность. `OutOfTime` игнорирует поля других носителей
 * (docs/dev/architecture.md, «Часы»).
 */
export function fieldApplies(
	field: TimeField,
	tags: ReadonlySet<TagId>,
	id: EntityId | null,
	point: Vec2,
): boolean {
	if (tags.has("OutOfTime") && field.bearerId !== id) return false;
	return (
		matchesQuery(field.requires, tags) && !excludedBy(field.excludes, tags) && inArea(field, point)
	);
}

/** Множители перемножаются; остановка (×0) поглощает всё. */
export function computeRate(world: World, entity: Entity, skipFieldId?: number): number {
	const tags = effectiveTags(entity);
	let rate = 1;
	for (const field of world.timeFields) {
		if (field.id === skipFieldId) continue;
		if (fieldApplies(field, tags, entity.id, entity.position)) rate *= field.factor;
	}
	return rate;
}

export function cellRate(world: World, index: number): number {
	const center = cellCenter(world.grid, index);
	let rate = 1;
	for (const field of world.timeFields) {
		if (fieldApplies(field, MAP_TAGS, null, center)) rate *= field.factor;
	}
	return rate;
}

/** Локальный шаг времени сущности за тик мира. */
export function localDt(entity: Entity): number {
	return WORLD_DT * entity.clock.rate;
}

export function addTimeField(
	world: World,
	bearerId: EntityId,
	spec: TimeFieldSpec,
	cause: Cause,
): TimeField {
	const field: TimeField = {
		id: world.nextEffectId++,
		bearerId,
		factor: spec.factor,
		remainingSec: spec.durationSec,
		requires: spec.requires,
		excludes: spec.excludes,
		area: spec.area ?? null,
		name: spec.name,
		cause,
	};
	world.timeFields.push(field);
	emit(world, { kind: "timeFieldAdded", cause, after: spec.factor, note: spec.name });
	return field;
}

/**
 * Пересчитать часы всех сущностей и клеток, отсчитать длительность полей.
 * Когда время сущности снова пошло, накопленные удары применяются разом.
 */
export function clockSystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		const before = entity.clock.rate;
		const after = computeRate(world, entity);
		if (after === before) continue;
		entity.clock.rate = after;
		emit(world, {
			kind: "clockRate",
			target: entity.id,
			cause: { system: "clock" },
			before,
			after,
		});
		if (before === 0 && after > 0) releasePending(world, entity);
	}
	const rates = world.grid.rates;
	for (let i = 0; i < rates.length; i++) rates[i] = cellRate(world, i);
	tickFields(world);
}

/**
 * Длительность поля идёт в часах носителя (docs/06-time-system.md). ДОПУЩЕНИЕ: поле не
 * замедляет отсчёт самого себя, иначе носитель «во времени» с остановкой застыл бы навсегда.
 * Если носителя больше нет, поле кончается: закон держится носителем.
 */
function tickFields(world: World): void {
	const ended: TimeField[] = [];
	for (const field of world.timeFields) {
		const bearer = world.entities.get(field.bearerId);
		if (bearer === undefined || !isAlive(bearer)) {
			ended.push(field);
			continue;
		}
		field.remainingSec -= WORLD_DT * computeRate(world, bearer, field.id);
		if (field.remainingSec <= 1e-9) ended.push(field);
	}
	if (ended.length === 0) return;
	world.timeFields = world.timeFields.filter((f) => !ended.includes(f));
	for (const field of ended) {
		emit(world, { kind: "timeFieldEnded", cause: field.cause, note: field.name });
	}
}
