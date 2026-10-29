// Полёт снарядов в их собственных часах и попадания.

import { damage } from "../api/deliver.ts";
import { localDt } from "../clock.ts";
import { type Entity, isAlive } from "../entity.ts";
import { CELL_SIZE } from "../grid.ts";
import { add, dot, length, normalize, scale, sub, type Vec2 } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

/** На каком расстоянии вдоль пути отрезок задевает круг; null — не задевает. */
function hitDistance(
	from: Vec2,
	dir: Vec2,
	travel: number,
	center: Vec2,
	radius: number,
): number | null {
	const toCenter = sub(center, from);
	const along = Math.max(0, Math.min(travel, dot(toCenter, dir)));
	const closest = add(from, scale(dir, along));
	return length(sub(center, closest)) <= radius ? along : null;
}

function insideGrid(world: World, p: Vec2): boolean {
	return (
		p.x >= 0 &&
		p.y >= 0 &&
		p.x < world.grid.width * CELL_SIZE &&
		p.y < world.grid.height * CELL_SIZE
	);
}

function fly(world: World, projectile: Entity, targets: readonly Entity[]): void {
	const data = projectile.projectile;
	if (data === null) return;
	const dt = localDt(projectile);
	if (dt === 0) return;
	const dir = normalize(projectile.velocity);
	const travel = Math.min(length(projectile.velocity) * dt, data.remainingRange);
	let best: { target: Entity; at: number } | null = null;
	for (const target of targets) {
		if (target === projectile) continue;
		const at = hitDistance(
			projectile.position,
			dir,
			travel,
			target.position,
			target.stats.radiusUnits + projectile.stats.radiusUnits,
		);
		if (at !== null && (best === null || at < best.at)) best = { target, at };
	}
	const cause = { lawId: data.lawId, sourceId: data.ownerId };
	if (best !== null) {
		projectile.position = add(projectile.position, scale(dir, best.at));
		projectile.state.removed = true;
		emit(world, { kind: "projectileHit", target: best.target.id, cause, note: projectile.name });
		damage(world, best.target, data.damage, cause);
		return;
	}
	projectile.position = add(projectile.position, scale(dir, travel));
	data.remainingRange -= travel;
	if (data.remainingRange <= 1e-6 || !insideGrid(world, projectile.position)) {
		projectile.state.removed = true;
		emit(world, { kind: "projectileSpent", target: projectile.id, cause, note: projectile.name });
	}
}

export function projectileSystem(world: World): void {
	const entities = entitiesInOrder(world);
	// Снаряд сталкивается с веществом. Друг с другом снаряды не сталкиваются (ДОПУЩЕНИЕ).
	const targets = entities.filter(
		(e) => isAlive(e) && e.tags.has("Material") && !e.tags.has("Projectile"),
	);
	for (const entity of entities) {
		if (isAlive(entity) && entity.projectile !== null) fly(world, entity, targets);
	}
}
