// Температура, горение, распространение огня, таяние и замерзание.
// docs/02-atoms.md («Температура»), docs/04-laws-catalog.md (L3-01, L3-02), docs/06-time-system.md (правило 3).
//
// Тепло, которое сущность получает от мира, идёт по её часам: огонь в остановленном времени
// не греет тех, кто во времени, но обжигает того, кто вне времени и вошёл в огонь.

import { changeCellTemperature, scorch } from "../api/cells.ts";
import { applyDamage, applyTemperature, applyZoneDamage } from "../api/effects.ts";
import { localDt } from "../clock.ts";
import { type Entity, isAlive } from "../entity.ts";
import type { Cause } from "../events.ts";
import { cellIndexAt, cellNeighbors, type Grid } from "../grid.ts";
import {
	BURN_INJURY_DAMAGE_PER_DEGREE_SEC,
	BURN_INJURY_TEMP,
	BURNING_DAMAGE_PER_SEC,
	BURNING_NEIGHBOR_HEAT_PER_SEC,
	BURNING_SELF_HEAT_PER_SEC,
	CELL_FIRE_HEAT_PER_SEC,
	CONTACT_GAP_UNITS,
	ICE_HOLD_TEMP,
	LIMB_FREEZE_LOSS_PCT_PER_SEC,
	LIMB_FREEZE_TEMP,
	PASSIVE_RELAX_PER_SEC,
	SCORCHED_HEAT_PER_SEC,
	WARM_BLOODED_RELAX_PER_SEC,
} from "../physics.ts";
import { distance, WORLD_DT } from "../units.ts";
import { entitiesInOrder, type World } from "../world.ts";

const THERMAL: Cause = { system: "thermal" };
const MINOR = { minor: true } as const;
const RELAX = { relax: true } as const;

function towards(value: number, goal: number, step: number): number {
	if (value < goal) return Math.min(goal, value + step);
	return Math.max(goal, value - step);
}

function inContact(a: Entity, b: Entity): boolean {
	return (
		distance(a.position, b.position) <=
		a.stats.radiusUnits + b.stats.radiusUnits + CONTACT_GAP_UNITS
	);
}

/** Жар от земли под ногами и от горящих соседей — по часам получателя. */
function receiveHeat(world: World, entity: Entity, dt: number, burning: readonly Entity[]): void {
	const index = cellIndexAt(world.grid, entity.position);
	const cell = index === null ? undefined : world.grid.cells[index];
	if (cell?.surface === "scorched") {
		applyTemperature(world, entity, SCORCHED_HEAT_PER_SEC * dt, THERMAL, MINOR);
	}
	if (cell !== undefined && cell.burningSec > 0) {
		applyTemperature(world, entity, CELL_FIRE_HEAT_PER_SEC * dt, THERMAL, MINOR);
	}
	for (const source of burning) {
		if (source !== entity && inContact(source, entity)) {
			applyTemperature(
				world,
				entity,
				BURNING_NEIGHBOR_HEAT_PER_SEC * dt,
				{ ...THERMAL, sourceId: source.id },
				MINOR,
			);
		}
	}
}

/** Своё: остывание к норме, горение, ожоги, замерзание конечностей — по своим часам. */
function selfProcesses(world: World, entity: Entity, dt: number): void {
	// Сначала жар собственного огня, потом остывание: иначе только что вспыхнувшее
	// на пороге тут же гасло бы и вспыхивало снова.
	if (entity.state.burning) {
		applyTemperature(world, entity, BURNING_SELF_HEAT_PER_SEC * dt, THERMAL, MINOR);
		applyDamage(world, entity, BURNING_DAMAGE_PER_SEC * dt, THERMAL, true);
	}
	const t = entity.state.temperature;
	const relax = entity.tags.has("WarmBlooded") ? WARM_BLOODED_RELAX_PER_SEC : PASSIVE_RELAX_PER_SEC;
	const relaxed = towards(t, 0, relax * dt);
	if (relaxed !== t) applyTemperature(world, entity, relaxed - t, THERMAL, RELAX);
	// Ожоги и обморожение — у тех, кто держит свою температуру (docs/02-atoms.md, `Теплокровный`).
	if (!entity.tags.has("WarmBlooded")) return;
	const now = entity.state.temperature;
	if (now > BURN_INJURY_TEMP) {
		applyDamage(
			world,
			entity,
			(now - BURN_INJURY_TEMP) * BURN_INJURY_DAMAGE_PER_DEGREE_SEC * dt,
			THERMAL,
			true,
		);
	}
	if (now < LIMB_FREEZE_TEMP) {
		applyZoneDamage(world, entity, "arms", LIMB_FREEZE_LOSS_PCT_PER_SEC * dt, THERMAL, true);
		applyZoneDamage(world, entity, "legs", LIMB_FREEZE_LOSS_PCT_PER_SEC * dt, THERMAL, true);
	}
}

/** Горящая сущность греет землю под собой: бегущий горящий поджигает траву. */
function heatGround(world: World, burning: readonly Entity[]): void {
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
function cellProcesses(world: World): void {
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

export function thermalSystem(world: World): void {
	const entities = entitiesInOrder(world).filter((e) => isAlive(e) && e.tags.has("Material"));
	const burning = entities.filter((e) => e.state.burning);
	for (const entity of entities) {
		const dt = localDt(entity);
		if (dt === 0) continue;
		receiveHeat(world, entity, dt, burning);
		selfProcesses(world, entity, dt);
	}
	heatGround(world, burning);
	cellProcesses(world);
}
