// Числа физики мира, общие для всех законов. Это не параметры законов, а свойства мира.
// Значения, которых нет в дизайне, — ДОПУЩЕНИЯ, см. docs/dev/decisions.md.

import type { Surface } from "./grid.ts";
import type { Seconds } from "./units.ts";

// docs/02-atoms.md, «Температура».
export const FROSTBITE_TEMP = -10;
export const LIMB_FREEZE_TEMP = -30;
export const BURN_INJURY_TEMP = 10;
/** Горение начинается при +30° и выше. Сколько для этого нужно попаданий, решает сила закона (прокачка) и состояние цели. */
export const IGNITION_TEMP = 30;

/** Ниже этой температуры вода замерзает (на клетке и на теле). */
export const WATER_FREEZE_TEMP = -10;
/** При этой температуре и выше лёд тает: Пламя (+15) снимает свежую Стужу (−15). */
export const ICE_MELT_TEMP = 0;

/** Сколько градусов тепла уходит на испарение одной ступени влажности. */
export const EVAPORATION_HEAT = 15;
/** Насколько сильнее остывает мокрое тело (docs/04-laws-catalog.md, L3-02). */
export const WET_COOLING_MULTIPLIER = 2;

/** Теплокровные держат свою температуру: возврат к норме, градусов в секунду. */
export const WARM_BLOODED_RELAX_PER_SEC = 3;
/** Остальные сущности и клетки остывают/согреваются медленнее. */
export const PASSIVE_RELAX_PER_SEC = 1;

export const BURNING_SELF_HEAT_PER_SEC = 4;
/** Горящая сущность передаёт соседям +5/с (docs/04-laws-catalog.md, L3-01). */
export const BURNING_NEIGHBOR_HEAT_PER_SEC = 5;
/** Касание для передачи жара: зазор между краями тел. */
export const CONTACT_GAP_UNITS = 16;
export const BURNING_DAMAGE_PER_SEC = 5;
/** Ожоги: урон торсу за каждый градус выше порога в секунду. */
export const BURN_INJURY_DAMAGE_PER_DEGREE_SEC = 0.5;
/** Замерзание конечностей: потеря целостности рук и ног, % в секунду. */
export const LIMB_FREEZE_LOSS_PCT_PER_SEC = 5;

/** Выжженная земля горячая: +2/с стоящим (docs/04-laws-catalog.md, L3-01). */
export const SCORCHED_HEAT_PER_SEC = 2;
export const SCORCHED_TRACE_SEC: Seconds = 120;
/** Лёд на земле (docs/04-laws-catalog.md, L3-02). */
export const ICE_TRACE_SEC: Seconds = 90;
/** Холод, который держит лёд, пока не растаял. */
export const ICE_HOLD_TEMP = -10;
export const GRASS_BURN_SEC: Seconds = 5;
export const CELL_FIRE_HEAT_PER_SEC = 5;

export const SOAKED_TO_WET_SEC: Seconds = 5;
export const WET_TO_DRY_SEC: Seconds = 10;
export const CELL_DRYING_SEC: Seconds = 30;

/** Сколько своего времени сохнет каждая ступень влажности. */
export function dryingTime(wetness: "dry" | "wet" | "soaked"): Seconds {
	if (wetness === "soaked") return SOAKED_TO_WET_SEC;
	return wetness === "wet" ? WET_TO_DRY_SEC : 0;
}

/** Сотрясение при голове 0% (docs/02-atoms.md: «1–2 секунды»). */
export const CONCUSSION_SEC: Seconds = 1.5;

/** Торможение отброшенного тела о поверхность, ед/с². */
export const GROUND_DECELERATION = 1200;
const FRICTION: Readonly<Record<Surface, number>> = {
	ground: 1,
	grass: 1,
	stone: 1,
	scorched: 1,
	water: 1.5,
	// Лёд уменьшает трение: отбрасывание вдвое дальше (docs/05-interactions.md).
	ice: 0.5,
};

export function friction(surface: Surface): number {
	return FRICTION[surface];
}

/** Урон торсу при ударе за каждую единицу потерянной скорости. */
export const IMPACT_DAMAGE_PER_SPEED = 0.05;
/** Медленнее этого столкновение — просто касание. */
export const IMPACT_MIN_SPEED = 100;

/** Регенерация (`Regenerating`): зоны тела, % целостности в секунду своего времени. */
export const REGEN_ZONE_PCT_PER_SEC = 1;
/** Регенерация закрывает одну открытую рану за это время. */
export const REGEN_WOUND_CLOSE_SEC: Seconds = 10;
