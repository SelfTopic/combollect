// Закон — данные + обработчик. См. docs/dev/architecture.md, «Законы», и шаблон docs/04-laws-catalog.md.

import type { ConductionGraph } from "./api/conduction.ts";
import type { BodyZone, Entity, LawTarget } from "./entity.ts";
import { effectiveTags } from "./entityTags.ts";
import type { Cause, LawId } from "./events.ts";
import type { SpawnSpec } from "./spawn.ts";
import { excludedBy, matchesQuery, type TagQuery } from "./tags.ts";
import type { Seconds, Units, Vec2 } from "./units.ts";
import type { World } from "./world.ts";

// docs/dev/glossary.md, «Уровни».
export const TIERS = {
	Psyche: 0,
	Flesh: 1,
	Mechanics: 2,
	Thermal: 3,
	Electromagnetic: 4,
	Nuclear: 5,
	Space: 6,
	Time: 7,
} as const;
export type Tier = (typeof TIERS)[keyof typeof TIERS];

/**
 * Форма закона:
 * - `melee` — удар по сущности рядом;
 * - `point` — точка на карте;
 * - `cone` — конус перед носителем в сторону точки;
 * - `projectile` — снаряд в сторону точки;
 * - `global` — вся карта.
 */
export type LawForm = "melee" | "point" | "cone" | "projectile" | "global";

export interface LoreCost {
	/** Старение: на сколько процентов навсегда падает максимум здоровья. */
	readonly agingMaxHealthPct: number;
}

export interface Cost {
	/** Сколько лорного ресурса носителя тратится. */
	readonly resource: number;
	readonly lore: LoreCost | null;
}

export interface LawDef {
	readonly id: LawId;
	/** Название для журнала и интерфейса — по-русски. */
	readonly name: string;
	readonly tier: Tier;
	readonly requires: TagQuery;
	readonly excludes: TagQuery;
	readonly form: LawForm;
	readonly windup: Seconds;
	readonly cooldown: Seconds;
	readonly cost: Cost;
	/** Нужен ли жест руками (сломанные руки — нельзя, docs/02-atoms.md, «Руки»). */
	readonly gesture: boolean;
	/** Базовая атака: страдает от повреждённых рук (docs/04-laws-catalog.md, «Базовая атака»). */
	readonly basicAttack: boolean;
	/** Базовые параметры; `rangeUnits` — дальность применения. */
	readonly params: Readonly<Record<string, number>>;
	apply(ctx: LawContext): void;
}

export interface TimeFieldSpec {
	readonly factor: number;
	readonly durationSec: Seconds;
	readonly requires: TagQuery;
	readonly excludes: TagQuery;
	readonly area?: { readonly center: Vec2; readonly radiusUnits: Units };
	readonly name: string;
}

/**
 * Всё, что закон может сделать с миром. Каждое действие пишет событие в журнал
 * с причиной (этот закон, этот носитель).
 */
export interface LawContext {
	readonly world: World;
	readonly law: LawDef;
	readonly bearer: Entity;
	readonly target: LawTarget;
	readonly params: Readonly<Record<string, number>>;
	readonly cause: Cause;
	/** Точка цели (для `entity` — позиция цели, для `none` — позиция носителя). */
	targetPoint(): Vec2;
	/** Сущности в круге, на которых действует этот закон, в порядке id. */
	affectedInRadius(center: Vec2, radius: Units): Entity[];
	affects(entity: Entity): boolean;
	changeTemperature(entity: Entity, delta: number): void;
	damage(entity: Entity, amount: number): void;
	damageZone(entity: Entity, zone: BodyZone, amountPct: number): void;
	/** Толчок: дистанция для массы «средняя» на обычной земле. */
	push(entity: Entity, direction: Vec2, distance: Units): void;
	changeCellTemperature(cell: number, delta: number): void;
	cellsInRadius(center: Vec2, radius: Units): number[];
	spawn(spec: SpawnSpec): Entity;
	addTimeField(spec: TimeFieldSpec): void;
	conductionGraph(entryPoint: Vec2, entryRadius: Units, linkRadius: Units): ConductionGraph;
	/** Оставить ток в воде; `alreadyShocked` — кого этот разряд уже ударил. */
	chargeWater(
		cells: readonly number[],
		durationSec: Seconds,
		damage: number,
		headPct: number,
		alreadyShocked: readonly Entity[],
	): void;
}

/** Действует ли закон на сущность. Только по меткам — никогда по идентичности. */
export function affects(law: LawDef, entity: Entity): boolean {
	const tags = effectiveTags(entity);
	return matchesQuery(law.requires, tags) && !excludedBy(law.excludes, tags);
}
