// Граф проводников. docs/04-laws-catalog.md, L4-01: ток идёт от проводника к соседним
// проводникам в радиусе; вода связывает всех, кто в ней стоит.

import { type Entity, isAlive } from "../entity.ts";
import { hasTag } from "../entityTags.ts";
import type { Cause } from "../events.ts";
import { cellIndexAt, waterRegion } from "../grid.ts";
import { distance, type Seconds, type Units, type Vec2 } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

export interface ConductionGraph {
	/** Все проводники, до которых дошёл ток, в порядке id. */
	readonly entities: Entity[];
	/** Клетки воды, по которым прошёл ток. */
	readonly waterCells: number[];
}

/** Край тела ближе `radius` к точке. */
function touches(entity: Entity, point: Vec2, radius: Units): boolean {
	return distance(entity.position, point) <= radius + entity.stats.radiusUnits;
}

/**
 * ДОПУЩЕНИЕ (docs/dev/decisions.md): ток входит в проводники, касающиеся точки удара,
 * и в воду, если точка на воде. Дальше — к проводникам в радиусе `linkRadius`
 * и ко всем проводникам, стоящим в той же воде. Лёд — не вода.
 */
export function conductionGraph(
	world: World,
	entryPoint: Vec2,
	entryRadius: Units,
	linkRadius: Units,
): ConductionGraph {
	const conductors = entitiesInOrder(world).filter((e) => isAlive(e) && hasTag(e, "Conductor"));
	const reached = new Set<Entity>();
	const water = new Set<number>();
	const queue: Entity[] = [];

	const visitWater = (cell: number | null): void => {
		if (cell === null || water.has(cell)) return;
		const region = waterRegion(world.grid, cell);
		if (region.length === 0) return;
		for (const index of region) water.add(index);
		for (const e of conductors) {
			const at = cellIndexAt(world.grid, e.position);
			if (at !== null && region.includes(at)) visit(e);
		}
	};
	const visit = (entity: Entity): void => {
		if (reached.has(entity)) return;
		reached.add(entity);
		queue.push(entity);
	};

	for (const e of conductors) if (touches(e, entryPoint, entryRadius)) visit(e);
	visitWater(cellIndexAt(world.grid, entryPoint));

	while (queue.length > 0) {
		const current = queue.shift() as Entity;
		visitWater(cellIndexAt(world.grid, current.position));
		for (const other of conductors) {
			if (distance(current.position, other.position) <= linkRadius) visit(other);
		}
	}
	return {
		entities: [...reached].sort((a, b) => a.id - b.id),
		waterCells: [...water].sort((a, b) => a - b),
	};
}

export function chargeWater(
	world: World,
	cells: readonly number[],
	durationSec: Seconds,
	damage: number,
	headDamagePct: number,
	alreadyShocked: readonly number[],
	cause: Cause,
): void {
	if (cells.length === 0) return;
	const id = world.nextEffectId++;
	world.charges.push({
		id,
		cells: [...cells],
		remainingSec: durationSec,
		damage,
		headDamagePct,
		shockedIds: [...alreadyShocked],
		cause,
	});
	emit(world, { kind: "waterCharged", cause, after: cells.length, note: `заряд ${id}` });
}
