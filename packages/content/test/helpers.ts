import {
	type Entity,
	type EventKind,
	issueCommand,
	type LawId,
	type LawTarget,
	type SpawnSpec,
	type Surface,
	type Vec2,
	type World,
} from "@combollect/core";
import { createTestWorld, eventsOf, runUntil } from "@combollect/core/testing";
import { stage1Laws } from "../src/index.ts";

export function arena(
	entities: readonly SpawnSpec[],
	surfaceAt?: (x: number, y: number) => Surface,
): { world: World; e: Entity[] } {
	const { world, entities: spawned } = createTestWorld({
		seed: 1,
		laws: stage1Laws,
		grid: { width: 40, height: 40, ...(surfaceAt ? { surfaceAt } : {}) },
		entities,
	});
	return { world, e: spawned };
}

export function slotOf(entity: Entity, lawId: LawId): number {
	const slot = entity.laws.findIndex((s) => s.lawId === lawId);
	if (slot < 0) throw new Error(`У ${entity.name} нет закона ${lawId}`);
	return slot;
}

/** Сбросить перезарядку, чтобы применить закон снова (в тестах, где важен не темп, а эффект). */
export function ready(entity: Entity, lawId: LawId): void {
	const slot = entity.laws[slotOf(entity, lawId)];
	if (slot !== undefined) slot.cooldownSec = 0;
}

export const at = (point: Vec2): LawTarget => ({ kind: "point", point });
export const on = (entity: Entity): LawTarget => ({ kind: "entity", id: entity.id });

/** Приказать применить закон и дождаться, пока он сработает. */
export function cast(world: World, bearer: Entity, lawId: LawId, target: LawTarget): void {
	const before = count(world, "lawApplied", bearer.id);
	issueCommand(world, bearer, { kind: "useLaw", slot: slotOf(bearer, lawId), target });
	const ok = runUntil(world, () => count(world, "lawApplied", bearer.id) > before, 10);
	if (!ok) throw new Error(`${lawId} не сработал`);
}

export function count(world: World, kind: EventKind, target?: number): number {
	return eventsOf(world, kind, target).length;
}

/** Индекс клетки по её координатам. */
export function cellIndex(world: World, x: number, y: number): number {
	return y * world.grid.width + x;
}

/** Центр клетки по её координатам. */
export function cellPoint(x: number, y: number): Vec2 {
	return { x: x * 32 + 16, y: y * 32 + 16 };
}

export function must<T>(value: T | undefined): T {
	if (value === undefined) throw new Error("Нет значения");
	return value;
}
