// Изменения клеток карты: температура, поверхность, влажность. См. docs/09-map.md.

import type { Cause } from "../events.ts";
import type { Cell, Surface } from "../grid.ts";
import {
	CELL_DRYING_SEC,
	EVAPORATION_HEAT,
	GRASS_BURN_SEC,
	ICE_MELT_TEMP,
	ICE_TRACE_SEC,
	IGNITION_TEMP,
	SCORCHED_TRACE_SEC,
	WATER_FREEZE_TEMP,
} from "../physics.ts";
import { emit, type World } from "../world.ts";

function cellOf(world: World, index: number): Cell {
	const cell = world.grid.cells[index];
	if (cell === undefined) throw new Error(`Нет клетки ${index}`);
	return cell;
}

export function setSurface(world: World, index: number, surface: Surface, cause: Cause): void {
	const cell = cellOf(world, index);
	const before = cell.surface;
	if (before === surface) return;
	cell.surface = surface;
	emit(world, { kind: "cellSurface", cell: index, cause, before, after: surface });
}

export function setCellMoisture(world: World, index: number, wet: boolean, cause: Cause): void {
	const cell = cellOf(world, index);
	const moisture = wet ? "wet" : "dry";
	cell.dryingSec = wet ? CELL_DRYING_SEC : 0;
	cell.evaporationHeat = 0;
	if (cell.moisture === moisture) return;
	const before = cell.moisture;
	cell.moisture = moisture;
	emit(world, { kind: "cellMoisture", cell: index, cause, before, after: moisture });
}

/** Тепло на мокрой клетке сначала уходит на высыхание, как и у сущностей. */
export function changeCellTemperature(
	world: World,
	index: number,
	delta: number,
	cause: Cause,
	options: { readonly minor?: boolean; readonly relax?: boolean } = {},
): void {
	const cell = cellOf(world, index);
	const minor = options.minor === true || options.relax === true;
	let rest = delta;
	if (options.relax !== true && rest > 0 && cell.moisture === "wet") {
		const absorbed = Math.min(rest, EVAPORATION_HEAT - cell.evaporationHeat);
		cell.evaporationHeat += absorbed;
		rest -= absorbed;
		if (cell.evaporationHeat >= EVAPORATION_HEAT - 1e-9)
			setCellMoisture(world, index, false, cause);
	}
	if (rest === 0) return;
	const before = cell.temperature;
	cell.temperature = before + rest;
	emit(world, {
		kind: "cellTemperature",
		cell: index,
		cause,
		before,
		after: cell.temperature,
		...(minor ? { minor: true } : {}),
	});
	updateCellPhase(world, index, cause);
}

/** Лёд тает в воду (или мокрую землю). docs/05-interactions.md, «Пламя + Лёд». */
export function meltIce(world: World, index: number, cause: Cause): void {
	const cell = cellOf(world, index);
	if (cell.surface !== "ice") return;
	cell.trace = null;
	// Растаявший лёд уже не холоднее точки таяния, иначе тут же замёрз бы снова.
	cell.temperature = Math.max(cell.temperature, ICE_MELT_TEMP);
	setSurface(world, index, cell.baseSurface, cause);
	if (cell.baseSurface !== "water") setCellMoisture(world, index, true, cause);
}

function freeze(world: World, index: number, cause: Cause): void {
	const cell = cellOf(world, index);
	cell.burningSec = 0;
	cell.trace = { kind: "ice", remainingSec: ICE_TRACE_SEC };
	setCellMoisture(world, index, false, cause);
	setSurface(world, index, "ice", cause);
}

/** Выжженная земля: нельзя поджечь снова. Сгоревшая трава потом станет землёй, а не травой. */
export function scorch(world: World, index: number, cause: Cause): void {
	const cell = cellOf(world, index);
	cell.burningSec = 0;
	cell.baseSurface = "ground";
	cell.trace = { kind: "scorched", remainingSec: SCORCHED_TRACE_SEC };
	setSurface(world, index, "scorched", cause);
}

export function updateCellPhase(world: World, index: number, cause: Cause): void {
	const cell = cellOf(world, index);
	const t = cell.temperature;
	if (cell.surface === "ice") {
		if (t >= ICE_MELT_TEMP) meltIce(world, index, cause);
		return;
	}
	if (t <= WATER_FREEZE_TEMP) {
		freeze(world, index, cause);
		return;
	}
	if (t <= IGNITION_TEMP || cell.moisture === "wet") return;
	if (cell.surface === "grass" && cell.burningSec === 0) {
		cell.burningSec = GRASS_BURN_SEC;
		emit(world, { kind: "cellIgnited", cell: index, cause });
	} else if (cell.surface === "ground") {
		scorch(world, index, cause);
	}
}
