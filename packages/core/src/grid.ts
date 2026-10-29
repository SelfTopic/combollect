// Карта из клеток. См. docs/09-map.md и docs/dev/architecture.md, «Карта».

import type { Seconds, Units, Vec2 } from "./units.ts";

export const CELL_SIZE: Units = 32;

export const SURFACES = ["ground", "grass", "stone", "water", "ice", "scorched"] as const;
export type Surface = (typeof SURFACES)[number];

/** Влажность клетки. «Вода» — это отдельная поверхность `water`. */
export type CellMoisture = "dry" | "wet";

/** След закона на клетке, который угасает в часах карты. */
export type TraceKind = "ice" | "scorched";

export interface CellTrace {
	readonly kind: TraceKind;
	remainingSec: Seconds;
}

export interface Cell {
	surface: Surface;
	/** Поверхность, которая вернётся, когда след угаснет. */
	baseSurface: Surface;
	temperature: number;
	moisture: CellMoisture;
	/** Сколько времени карты осталось до высыхания мокрой клетки. */
	dryingSec: Seconds;
	/** Тепло, уже ушедшее на испарение воды с мокрой клетки. */
	evaporationHeat: number;
	/** Сколько ещё горит трава на клетке (0 — не горит). */
	burningSec: Seconds;
	trace: CellTrace | null;
}

export interface Grid {
	readonly width: number;
	readonly height: number;
	readonly cells: Cell[];
	/** Ход часов каждой клетки (карта тоже во времени), пересчитывается каждый тик. */
	readonly rates: number[];
}

export function createCell(surface: Surface): Cell {
	return {
		surface,
		baseSurface: surface,
		temperature: 0,
		moisture: "dry",
		dryingSec: 0,
		evaporationHeat: 0,
		burningSec: 0,
		trace: null,
	};
}

export function createGrid(
	width: number,
	height: number,
	surfaceAt: (x: number, y: number) => Surface = () => "ground",
): Grid {
	const cells: Cell[] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) cells.push(createCell(surfaceAt(x, y)));
	}
	return { width, height, cells, rates: cells.map(() => 1) };
}

export function cellIndexAt(grid: Grid, point: Vec2): number | null {
	const x = Math.floor(point.x / CELL_SIZE);
	const y = Math.floor(point.y / CELL_SIZE);
	if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
	return y * grid.width + x;
}

export function cellAt(grid: Grid, point: Vec2): Cell | null {
	const index = cellIndexAt(grid, point);
	return index === null ? null : (grid.cells[index] ?? null);
}

export function cellCenter(grid: Grid, index: number): Vec2 {
	const x = index % grid.width;
	const y = Math.floor(index / grid.width);
	return { x: (x + 0.5) * CELL_SIZE, y: (y + 0.5) * CELL_SIZE };
}

/** Соседи по сторонам (без диагоналей). */
export function cellNeighbors(grid: Grid, index: number): number[] {
	const x = index % grid.width;
	const y = Math.floor(index / grid.width);
	const result: number[] = [];
	if (x > 0) result.push(index - 1);
	if (x < grid.width - 1) result.push(index + 1);
	if (y > 0) result.push(index - grid.width);
	if (y < grid.height - 1) result.push(index + grid.width);
	return result;
}

/** Клетки, центр которых в радиусе от точки. */
export function cellsInRadius(grid: Grid, point: Vec2, radius: Units): number[] {
	const result: number[] = [];
	const minX = Math.max(0, Math.floor((point.x - radius) / CELL_SIZE));
	const maxX = Math.min(grid.width - 1, Math.floor((point.x + radius) / CELL_SIZE));
	const minY = Math.max(0, Math.floor((point.y - radius) / CELL_SIZE));
	const maxY = Math.min(grid.height - 1, Math.floor((point.y + radius) / CELL_SIZE));
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const cx = (x + 0.5) * CELL_SIZE;
			const cy = (y + 0.5) * CELL_SIZE;
			if (Math.hypot(cx - point.x, cy - point.y) <= radius) result.push(y * grid.width + x);
		}
	}
	return result;
}

/** Связная область воды (по сторонам), в которой лежит клетка. */
export function waterRegion(grid: Grid, start: number): number[] {
	if (grid.cells[start]?.surface !== "water") return [];
	const seen = new Set<number>([start]);
	const queue = [start];
	while (queue.length > 0) {
		const index = queue.shift() as number;
		for (const next of cellNeighbors(grid, index)) {
			if (!seen.has(next) && grid.cells[next]?.surface === "water") {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	return [...seen].sort((a, b) => a - b);
}
