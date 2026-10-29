// Мир — всё состояние симуляции. См. docs/dev/architecture.md, «Мир».

import type { Entity } from "./entity.ts";
import { type Cause, createEventLog, type EventLog, type GameEvent, type LawId } from "./events.ts";
import type { Grid } from "./grid.ts";
import type { SpecialInteraction } from "./interaction.ts";
import type { LawDef } from "./law.ts";
import { createRng, type Rng } from "./rng.ts";
import type { TagQuery } from "./tags.ts";
import type { EntityId, Seconds, Units, Vec2 } from "./units.ts";
import type { VictoryCondition, VictoryResult } from "./victory.ts";

/**
 * Активное изменение течения времени. Длительность считается в часах носителя.
 * См. docs/06-time-system.md.
 */
export interface TimeField {
	readonly id: number;
	readonly bearerId: EntityId;
	/** Множитель часов: 0.25 — замедление, 0 — остановка. */
	readonly factor: number;
	remainingSec: Seconds;
	/** На кого действует (обычно `InTime`). */
	readonly requires: TagQuery;
	readonly excludes: TagQuery;
	/** null — вся карта; иначе круг (временной шрам). */
	readonly area: { readonly center: Vec2; readonly radiusUnits: Units } | null;
	readonly name: string;
	readonly cause: Cause;
}

/**
 * Ток, оставшийся в воде после разряда. См. docs/04-laws-catalog.md, L4-01:
 * «вода на карте становится проводящей зоной на 3 с».
 */
export interface WaterCharge {
	readonly id: number;
	readonly cells: readonly number[];
	remainingSec: Seconds;
	readonly damage: number;
	readonly headDamagePct: number;
	/** Кого ток уже ударил: один заряд бьёт каждого один раз. */
	readonly shockedIds: EntityId[];
	readonly cause: Cause;
}

export type LawRegistry = ReadonlyMap<LawId, LawDef>;

export interface World {
	tick: number;
	readonly rng: Rng;
	readonly entities: Map<EntityId, Entity>;
	readonly grid: Grid;
	timeFields: TimeField[];
	charges: WaterCharge[];
	readonly events: EventLog;
	nextId: number;
	/** Счётчик для полей времени и зарядов воды. */
	nextEffectId: number;
	/** Определения законов. Это код, а не состояние, поэтому в сериализацию мира не входит. */
	readonly laws: LawRegistry;
	/** Особые взаимодействия законов — код из content/interactions.ts. */
	readonly interactions: readonly SpecialInteraction[];
	/** Условия победы — тоже код (docs/15-match-goals.md). */
	readonly victoryConditions: readonly VictoryCondition[];
	/** Итог матча; пока null, бой идёт. После итога мир больше не тикает. */
	result: VictoryResult | null;
}

export interface WorldOptions {
	readonly seed: number;
	readonly grid: Grid;
	readonly laws: LawRegistry;
	readonly victoryConditions?: readonly VictoryCondition[];
	readonly interactions?: readonly SpecialInteraction[];
}

export function createWorld(options: WorldOptions): World {
	return {
		tick: 0,
		rng: createRng(options.seed),
		entities: new Map(),
		grid: options.grid,
		timeFields: [],
		charges: [],
		events: createEventLog(),
		nextId: 1,
		nextEffectId: 1,
		laws: options.laws,
		interactions: options.interactions ?? [],
		victoryConditions: options.victoryConditions ?? [],
		result: null,
	};
}

/** Сущности в стабильном порядке (по id). См. docs/dev/code-style.md, «Детерминизм». */
export function entitiesInOrder(world: World): Entity[] {
	return [...world.entities.values()].sort((a, b) => a.id - b.id);
}

export function getEntity(world: World, id: EntityId): Entity | undefined {
	return world.entities.get(id);
}

export function emit(world: World, event: Omit<GameEvent, "tick">): void {
	const entry: GameEvent = { tick: world.tick, ...event };
	world.events.entries.push(entry);
	for (const interaction of world.interactions) interaction.react(world, entry);
}
