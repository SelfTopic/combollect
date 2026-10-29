// Сущность и её атомы: метки, состояния, ресурсы. См. docs/02-atoms.md и docs/dev/architecture.md.

import type { LawId } from "./events.ts";
import type { TagId } from "./tags.ts";
import type { EntityId, Seconds, Units, Vec2 } from "./units.ts";

export const BODY_ZONES = ["head", "torso", "arms", "legs"] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

/** Целостность зон тела, 0–100%. Только у сущностей с меткой `Limbs`. */
export type BodyZones = Record<BodyZone, number>;

export const WETNESS_LEVELS = ["dry", "wet", "soaked"] as const;
export type Wetness = (typeof WETNESS_LEVELS)[number];

export interface Clock {
	/** Множитель хода часов: 1 — норма, 0 — время остановлено. */
	rate: number;
}

/** Цель закона или действия. */
export type LawTarget =
	| { readonly kind: "none" }
	| { readonly kind: "point"; readonly point: Vec2 }
	| { readonly kind: "entity"; readonly id: EntityId };

/** Запланированное действие. См. docs/06-time-system.md, правило 4. */
export type PlannedAction =
	| { readonly kind: "move"; readonly to: Vec2 }
	| { readonly kind: "useLaw"; readonly slot: number; readonly target: LawTarget }
	| { readonly kind: "attack"; readonly targetId: EntityId };

export interface LawSlot {
	readonly lawId: LawId;
	/** Оставшаяся перезарядка в часах носителя. */
	cooldownSec: Seconds;
	/** Параметры закона у этого носителя (база из каталога + прокачка). */
	params: Record<string, number>;
}

/** Подготовка закона, которая идёт в часах носителя. */
export interface Windup {
	readonly slot: number;
	readonly target: LawTarget;
	remainingSec: Seconds;
}

/**
 * Изменение, которое пришло в остановленную сущность и ждёт возобновления её времени.
 * См. docs/06-time-system.md, правило 2.
 */
export type PendingEffect =
	| { readonly kind: "damage"; readonly amount: number }
	| { readonly kind: "zone"; readonly zone: BodyZone; readonly amountPct: number }
	| { readonly kind: "velocity"; readonly delta: Vec2 }
	| { readonly kind: "temperature"; readonly delta: number };

export interface PendingHit {
	readonly effect: PendingEffect;
	readonly lawId?: LawId;
	readonly sourceId?: EntityId;
}

export interface EntityState {
	/** Градусы относительно нормы (0 — норма). */
	temperature: number;
	wetness: Wetness;
	/** Сколько своего времени осталось до того, как влажность спадёт на ступень. */
	dryingSec: Seconds;
	/** Тепло, уже ушедшее на испарение текущей ступени влажности. */
	evaporationHeat: number;
	/** Горит ли сущность прямо сейчас. */
	burning: boolean;
	body: BodyZones | null;
	/** Сотрясение: сколько своего времени нельзя применять законы. */
	concussionSec: Seconds;
	windup: Windup | null;
	pending: PendingHit[];
	/** Сущность ушла из мира не через смерть (снаряд долетел). */
	removed: boolean;
}

export interface LoreResource {
	/** Название лорного ресурса для журнала: «Хронос», «Выносливость». */
	readonly name: string;
	value: number;
	max: number;
	regenPerSec: number;
}

export interface Resources {
	health: number;
	maxHealth: number;
	lore: LoreResource | null;
}

/** Данные снаряда: кто бросил, сколько осталось лететь, что делает при попадании. */
export interface ProjectileData {
	readonly lawId: LawId;
	readonly ownerId: EntityId;
	remainingRange: Units;
	readonly damage: number;
}

export interface EntityStats {
	readonly radiusUnits: Units;
	/** Скорость ходьбы при целом теле и обычном времени. */
	readonly moveSpeed: number;
}

export interface Entity {
	readonly id: EntityId;
	/** Имя для журнала. */
	readonly name: string;
	readonly tags: Set<TagId>;
	readonly state: EntityState;
	readonly resources: Resources;
	position: Vec2;
	/** Скорость от толчков и полёта (не ходьба). */
	velocity: Vec2;
	readonly clock: Clock;
	readonly laws: LawSlot[];
	plan: PlannedAction[];
	readonly stats: EntityStats;
	readonly projectile: ProjectileData | null;
}

export function isAlive(entity: Entity): boolean {
	return entity.resources.health > 0 && !entity.state.removed;
}

export function isStopped(entity: Entity): boolean {
	return entity.clock.rate === 0;
}
