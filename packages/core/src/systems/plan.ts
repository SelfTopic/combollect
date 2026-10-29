// План действий. docs/06-time-system.md, правило 4: план выполняется по порядку, как только
// сущность может действовать; невозможное пропускается.

import { type Entity, isAlive, type PlannedAction } from "../entity.ts";
import { slotDef, startLaw, whyCannotUse } from "../lawRunner.ts";
import { distance } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

export const TOO_FAR = "слишком далеко";
const ARRIVE_EPS = 0.5;
const MAX_STEPS_PER_TICK = 32;

/** Может ли сущность действовать: жива и её время идёт. */
export function canAct(entity: Entity): boolean {
	return isAlive(entity) && entity.clock.rate > 0;
}

function describePoint(point: { readonly x: number; readonly y: number }): string {
	return `(${Math.round(point.x)}, ${Math.round(point.y)})`;
}

/** Действие словами — для журнала. */
export function describeAction(world: World, entity: Entity, action: PlannedAction): string {
	switch (action.kind) {
		case "move":
			return `идти в ${describePoint(action.to)}`;
		case "useLaw": {
			const slot = entity.laws[action.slot];
			const name = slot === undefined ? `слот ${action.slot}` : slotDef(world, slot).name;
			const target = action.target;
			if (target.kind === "point") return `«${name}» в точку ${describePoint(target.point)}`;
			if (target.kind === "entity") return `«${name}» на #${target.id}`;
			return `«${name}»`;
		}
		case "attack":
			return `атаковать #${action.targetId}`;
	}
}

/**
 * Команда игрока или бота. Если сущность не может действовать (остановлена), команда
 * автоматически дописывается в план (docs/10-controls.md, Shift).
 */
export function issueCommand(
	world: World,
	entity: Entity,
	action: PlannedAction,
	options: { readonly queue?: boolean } = {},
): void {
	const queued = options.queue === true || !canAct(entity);
	if (queued) entity.plan.push(action);
	else entity.plan = [action];
	emit(world, {
		kind: "commandIssued",
		target: entity.id,
		cause: { sourceId: entity.id },
		after: queued ? "в план" : "сразу",
		note: describeAction(world, entity, action),
	});
}

export function basicAttackSlot(world: World, entity: Entity): number {
	return entity.laws.findIndex((slot) => slotDef(world, slot).basicAttack);
}

function skip(world: World, entity: Entity, action: PlannedAction, reason: string): void {
	entity.plan.shift();
	emit(world, {
		kind: "planSkipped",
		target: entity.id,
		cause: { system: "plan" },
		note: `${describeAction(world, entity, action)}: ${reason}`,
	});
}

/** Попробовать начать закон из плана. true — можно сразу брать следующее действие. */
function tryLaw(world: World, entity: Entity, action: PlannedAction, slot: number): boolean {
	const target = action.kind === "attack" ? { kind: "entity" as const, id: action.targetId } : null;
	const lawTarget = action.kind === "useLaw" ? action.target : target;
	if (lawTarget === null) return true;
	const reason = startLaw(world, entity, slot, lawTarget);
	if (reason !== null) {
		skip(world, entity, action, reason);
		return true;
	}
	entity.plan.shift();
	emit(world, {
		kind: "planStep",
		target: entity.id,
		cause: { system: "plan" },
		note: describeAction(world, entity, action),
	});
	return entity.state.windup === null;
}

function processPlan(world: World, entity: Entity): void {
	for (let step = 0; step < MAX_STEPS_PER_TICK; step++) {
		const head = entity.plan[0];
		if (head === undefined || entity.state.windup !== null) return;
		if (head.kind === "move") {
			if (distance(entity.position, head.to) > ARRIVE_EPS) return;
			entity.plan.shift();
			emit(world, {
				kind: "planStep",
				target: entity.id,
				cause: { system: "plan" },
				note: describeAction(world, entity, head),
			});
			continue;
		}
		if (head.kind === "useLaw") {
			if (!tryLaw(world, entity, head, head.slot)) return;
			continue;
		}
		const slot = basicAttackSlot(world, entity);
		if (slot < 0) {
			skip(world, entity, head, "нет базовой атаки");
			continue;
		}
		// Цель далеко — подходим (это делает movementSystem), действие остаётся в плане.
		if (whyCannotUse(world, entity, slot, { kind: "entity", id: head.targetId }) === TOO_FAR)
			return;
		if (!tryLaw(world, entity, head, slot)) return;
	}
}

export function planSystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (canAct(entity)) processPlan(world, entity);
	}
}
