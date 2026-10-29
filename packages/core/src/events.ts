// Журнал событий: каждое изменение мира с причиной. См. docs/dev/architecture.md, «Журнал событий».

import type { EntityId, Vec2 } from "./units.ts";

export type LawId = string;

export type EventKind =
	| "entitySpawned"
	| "entityRemoved"
	| "death"
	| "commandIssued"
	| "planStep"
	| "planSkipped"
	| "windupStarted"
	| "windupInterrupted"
	| "lawApplied"
	| "lawFizzled"
	| "cost"
	| "timeFieldAdded"
	| "timeFieldEnded"
	| "clockRate"
	| "hitStored"
	| "hitsReleased"
	| "health"
	| "maxHealth"
	| "bodyZone"
	| "concussion"
	| "temperature"
	| "wetness"
	| "ignited"
	| "extinguished"
	| "impulse"
	| "collision"
	| "projectileHit"
	| "projectileSpent"
	| "current"
	| "cellTemperature"
	| "cellSurface"
	| "cellMoisture"
	| "cellIgnited"
	| "waterCharged"
	| "matchEnded";

export type SystemName =
	| "clock"
	| "plan"
	| "law"
	| "movement"
	| "projectile"
	| "thermal"
	| "wetness"
	| "conduction"
	| "body"
	| "trace"
	| "death"
	| "victory";

/** Причина изменения: какой закон, чья сущность, какая система мира. */
export interface Cause {
	readonly lawId?: LawId;
	readonly sourceId?: EntityId;
	readonly system?: SystemName;
}

export type EventValue = number | string | boolean | Vec2 | null;

export interface GameEvent {
	readonly tick: number;
	readonly kind: EventKind;
	readonly target?: EntityId;
	/** Индекс клетки карты, если событие о клетке. */
	readonly cell?: number;
	/** Где это случилось (появление, смерть, попадание). */
	readonly at?: Vec2;
	readonly cause: Cause;
	readonly before?: EventValue;
	readonly after?: EventValue;
	readonly note?: string;
	/**
	 * Мелкое непрерывное изменение (нагрев за тик, остывание). Пишется, чтобы журнал был полным,
	 * но инструменты могут его прятать.
	 */
	readonly minor?: true;
}

export interface EventLog {
	readonly entries: GameEvent[];
}

export function createEventLog(): EventLog {
	return { entries: [] };
}
