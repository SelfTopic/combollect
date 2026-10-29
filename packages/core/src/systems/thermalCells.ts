// Тепло на клетках карты: огонь на траве, остывание, жар от горящих тел. Всё — по часам клетки.

import { changeCellTemperature, scorch } from "../api/cells.ts";
import type { Entity } from "../entity.ts";
import type { Cause } from "../events.ts";
import { cellIndexAt, cellNeighbors, type Grid } from "../grid.ts";
import {
	BURNING_NEIGHBOR_HEAT_PER_SEC,
	CELL_FIRE_HEAT_PER_SEC,
	ICE_HOLD_TEMP,
	PASSIVE_RELAX_PER_SEC,
} from "../physics.ts";
import { WORLD_DT } from "../units.ts";
import type { World } from "../world.ts";

const THERMAL: Cause = { system: "thermal" };
const MINOR = { minor: true } as const;
const RELAX = { relax: true } as const;

export function towards(value: number, goal: number, step: number): number {
	if (value < goal) return Math.min(goal, value + step);
	return Math.max(goal, value - step);
}

/** Горящая сущность греет землю под собой: бегущий горящий поджигает траву. */
export function heatGround(world: World, burning: readonly Entity[]): void {
	for (const entity of burning) {
		const index = cellIndexAt(world.grid, entity.position);
		if (index === null) continue;
		const dt = WORLD_DT * (world.grid.rates[index] ?? 1);
		if (dt > 0)
			changeCellTemperature(
				world,
				index,
				BURNING_NEIGHBOR_HEAT_PER_SEC * dt,
				{ ...THERMAL, sourceId: entity.id },
				MINOR,
			);
	}
}

function cellDt(grid: Grid, index: number): number {
	return WORLD_DT * (grid.rates[index] ?? 1);
}

/** Огонь на траве, остывание клеток. Всё — по часам клетки. */
export function cellProcesses(world: World): void {
	const grid = world.grid;
	const burningCells: number[] = [];
	grid.cells.forEach((cell, index) => {
		if (cell.burningSec > 0) burningCells.push(index);
	});
	for (const index of burningCells) {
		const dt = cellDt(grid, index);
		if (dt === 0) continue;
		for (const next of cellNeighbors(grid, index)) {
			changeCellTemperature(world, next, CELL_FIRE_HEAT_PER_SEC * dt, THERMAL, MINOR);
		}
		const cell = grid.cells[index];
		if (cell === undefined) continue;
		cell.burningSec = Math.max(0, cell.burningSec - dt);
		if (cell.burningSec === 0) scorch(world, index, THERMAL);
	}
	grid.cells.forEach((cell, index) => {
		const dt = cellDt(grid, index);
		if (dt === 0 || cell.burningSec > 0) return;
		// Лёд держит холод, пока не растает; остальное возвращается к норме.
		const goal = cell.surface === "ice" ? Math.min(ICE_HOLD_TEMP, cell.temperature) : 0;
		const next = towards(cell.temperature, goal, PASSIVE_RELAX_PER_SEC * dt);
		if (next !== cell.temperature) {
			changeCellTemperature(world, index, next - cell.temperature, THERMAL, RELAX);
		}
	});
}
