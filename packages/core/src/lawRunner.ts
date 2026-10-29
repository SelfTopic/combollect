// Применение законов: проверка, подготовка, цена, действие.

import { changeCellTemperature } from "./api/cells.ts";
import { chargeWater, conductionGraph } from "./api/conduction.ts";
import { changeTemperature, damage, damageZone, push } from "./api/deliver.ts";
import { applyAging } from "./api/effects.ts";
import { canGesture, isConcussed } from "./body.ts";
import { addTimeField } from "./clock.ts";
import { type Entity, isAlive, type LawSlot, type LawTarget } from "./entity.ts";
import type { Cause } from "./events.ts";
import { cellsInRadius } from "./grid.ts";
import { affects, type LawContext, type LawDef } from "./law.ts";
import { spawn } from "./spawn.ts";
import { TOO_FAR } from "./systems/plan.ts";
import { distance, type Seconds, type Vec2 } from "./units.ts";
import { emit, entitiesInOrder, type World } from "./world.ts";

export function slotDef(world: World, slot: LawSlot): LawDef {
	const def = world.laws.get(slot.lawId);
	if (def === undefined) throw new Error(`Неизвестный закон ${slot.lawId}`);
	return def;
}

/** Подготовка и перезарядка с учётом прокачки (параметры `windupSec`, `cooldownSec` слота). */
export function windupOf(def: LawDef, slot: LawSlot): Seconds {
	return slot.params.windupSec ?? def.windup;
}

export function cooldownOf(def: LawDef, slot: LawSlot): Seconds {
	return slot.params.cooldownSec ?? def.cooldown;
}

function resolvePoint(world: World, bearer: Entity, target: LawTarget): Vec2 | null {
	if (target.kind === "point") return target.point;
	if (target.kind === "none") return bearer.position;
	const entity = world.entities.get(target.id);
	return entity !== undefined && isAlive(entity) ? entity.position : null;
}

/** Почему закон сейчас нельзя применить; null — можно. */
export function whyCannotUse(
	world: World,
	bearer: Entity,
	slotIndex: number,
	target: LawTarget,
): string | null {
	const slot = bearer.laws[slotIndex];
	if (slot === undefined) return "нет такого закона";
	const def = slotDef(world, slot);
	if (!isAlive(bearer)) return "носитель мёртв";
	if (bearer.state.windup !== null) return "занят подготовкой";
	if (isConcussed(bearer)) return "сотрясение";
	if (def.gesture && !canGesture(bearer)) return "нет жеста: руки сломаны";
	if (slot.cooldownSec > 0) return "перезарядка";
	if (def.cost.resource > (bearer.resources.lore?.value ?? 0)) return "не хватает ресурса";
	if (def.form === "melee" && target.kind !== "entity") return "нужна цель";
	if (
		(def.form === "point" || def.form === "cone" || def.form === "projectile") &&
		target.kind === "none"
	) {
		return "нужна точка";
	}
	const point = resolvePoint(world, bearer, target);
	if (point === null) return "цели нет";
	const range = slot.params.rangeUnits;
	if (range !== undefined && (def.form === "melee" || def.form === "point")) {
		const reach =
			target.kind === "entity"
				? range + bearer.stats.radiusUnits + (world.entities.get(target.id)?.stats.radiusUnits ?? 0)
				: range;
		if (distance(bearer.position, point) > reach) return TOO_FAR;
	}
	return null;
}

export function startLaw(
	world: World,
	bearer: Entity,
	slotIndex: number,
	target: LawTarget,
): string | null {
	const reason = whyCannotUse(world, bearer, slotIndex, target);
	if (reason !== null) return reason;
	const slot = bearer.laws[slotIndex] as LawSlot;
	const def = slotDef(world, slot);
	const windup = windupOf(def, slot);
	if (windup > 0) {
		bearer.state.windup = { slot: slotIndex, target, remainingSec: windup };
		emit(world, {
			kind: "windupStarted",
			target: bearer.id,
			cause: { lawId: def.id, sourceId: bearer.id },
			after: windup,
			note: def.name,
		});
		return null;
	}
	completeLaw(world, bearer, slotIndex, target);
	return null;
}

/** Подготовка закончилась (или её не было): заплатить цену и применить. */
export function completeLaw(
	world: World,
	bearer: Entity,
	slotIndex: number,
	target: LawTarget,
): void {
	const slot = bearer.laws[slotIndex] as LawSlot;
	const def = slotDef(world, slot);
	const cause: Cause = { lawId: def.id, sourceId: bearer.id };
	const lore = bearer.resources.lore;
	if (resolvePoint(world, bearer, target) === null || def.cost.resource > (lore?.value ?? 0)) {
		emit(world, { kind: "lawFizzled", target: bearer.id, cause, note: def.name });
		return;
	}
	if (lore !== null && def.cost.resource > 0) {
		const before = lore.value;
		lore.value -= def.cost.resource;
		emit(world, {
			kind: "cost",
			target: bearer.id,
			cause,
			before,
			after: lore.value,
			note: lore.name,
		});
	}
	slot.cooldownSec = cooldownOf(def, slot);
	emit(world, { kind: "lawApplied", target: bearer.id, cause, note: def.name });
	def.apply(createLawContext(world, def, slot, bearer, target, cause));
	// Лорная цена платится за применение (docs/04-laws-catalog.md, L7-01: «за применение»).
	if (def.cost.lore !== null) applyAging(world, bearer, def.cost.lore.agingMaxHealthPct, cause);
}

function createLawContext(
	world: World,
	law: LawDef,
	slot: LawSlot,
	bearer: Entity,
	target: LawTarget,
	cause: Cause,
): LawContext {
	return {
		world,
		law,
		bearer,
		target,
		params: slot.params,
		cause,
		targetPoint: () => resolvePoint(world, bearer, target) ?? bearer.position,
		affects: (entity) => affects(law, entity),
		affectedInRadius: (center, radius) =>
			entitiesInOrder(world).filter(
				(e) =>
					isAlive(e) &&
					distance(e.position, center) <= radius + e.stats.radiusUnits &&
					affects(law, e),
			),
		changeTemperature: (entity, delta) => changeTemperature(world, entity, delta, cause),
		damage: (entity, amount) => damage(world, entity, amount, cause),
		damageZone: (entity, zone, amountPct) => damageZone(world, entity, zone, amountPct, cause),
		push: (entity, direction, dist) => push(world, entity, direction, dist, cause),
		changeCellTemperature: (cell, delta) => changeCellTemperature(world, cell, delta, cause),
		cellsInRadius: (center, radius) => cellsInRadius(world.grid, center, radius),
		spawn: (spec) => spawn(world, spec, cause),
		addTimeField: (spec) => {
			addTimeField(world, bearer.id, spec, cause);
		},
		conductionGraph: (point, entryRadius, linkRadius) =>
			conductionGraph(world, point, entryRadius, linkRadius),
		chargeWater: (cells, durationSec, dmg, headPct, alreadyShocked) =>
			chargeWater(
				world,
				cells,
				durationSec,
				dmg,
				headPct,
				alreadyShocked.map((e) => e.id),
				cause,
			),
	};
}
