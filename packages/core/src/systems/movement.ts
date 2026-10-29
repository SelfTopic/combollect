// Движение: ходьба по плану и полёт от толчков с трением и столкновениями.

import { addVelocity, damage } from "../api/deliver.ts";
import { speedFactor } from "../body.ts";
import { localDt } from "../clock.ts";
import { type Entity, isAlive } from "../entity.ts";
import type { Cause } from "../events.ts";
import { CELL_SIZE, cellAt } from "../grid.ts";
import {
	friction,
	GROUND_DECELERATION,
	IMPACT_DAMAGE_PER_SPEED,
	IMPACT_MIN_SPEED,
} from "../physics.ts";
import { massFactor } from "../tags.ts";
import { add, distance, dot, length, normalize, scale, sub, type Vec2, ZERO } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";
import { basicAttackSlot } from "./plan.ts";

const MOVEMENT: Cause = { system: "movement" };
const REACH_MARGIN = 1;

function overlaps(a: Entity, at: Vec2, b: Entity): boolean {
	return distance(at, b.position) < a.stats.radiusUnits + b.stats.radiusUnits;
}

/** С чем тело может столкнуться: вещество, не снаряды (снаряды попадают сами). */
function isSolid(entity: Entity): boolean {
	return isAlive(entity) && entity.tags.has("Material") && !entity.tags.has("Projectile");
}

function clampToGrid(world: World, point: Vec2): Vec2 {
	const maxX = world.grid.width * CELL_SIZE - 0.001;
	const maxY = world.grid.height * CELL_SIZE - 0.001;
	return { x: Math.min(maxX, Math.max(0, point.x)), y: Math.min(maxY, Math.max(0, point.y)) };
}

/** Куда идти по плану и на каком расстоянии остановиться. */
function walkGoal(world: World, entity: Entity): { point: Vec2; stopAt: number } | null {
	const head = entity.plan[0];
	if (head === undefined || head.kind === "useLaw") return null;
	if (head.kind === "move") return { point: head.to, stopAt: 0 };
	const target = world.entities.get(head.targetId);
	const slot = entity.laws[basicAttackSlot(world, entity)];
	if (target === undefined || !isAlive(target) || slot === undefined) return null;
	const reach = (slot.params.rangeUnits ?? 0) + entity.stats.radiusUnits + target.stats.radiusUnits;
	// Чуть ближе дальности удара, чтобы не застыть на самой границе из-за округления.
	return { point: target.position, stopAt: Math.max(0, reach - REACH_MARGIN) };
}

/**
 * Столкновение отброшенного тела: неупругий удар. Скорость делится по массам, потерянная
 * скорость — урон обоим (docs/04-laws-catalog.md, L2-01: «урон пропорционально скорости»).
 * Местность (`Terrain`) вросла в землю и не сдвигается. ДОПУЩЕНИЕ, см. decisions.md.
 */
function collide(world: World, mover: Entity, other: Entity): void {
	const v = mover.velocity;
	const m1 = massFactor(mover.tags);
	const common = other.tags.has("Terrain") ? ZERO : scale(v, m1 / (m1 + massFactor(other.tags)));
	const lost = length(sub(v, common));
	mover.velocity = common;
	emit(world, {
		kind: "collision",
		target: mover.id,
		cause: { ...MOVEMENT, sourceId: other.id },
		before: Math.round(length(v)),
		after: Math.round(length(common)),
	});
	if (length(common) > 0) addVelocity(world, other, common, { ...MOVEMENT, sourceId: mover.id });
	if (lost < IMPACT_MIN_SPEED) return;
	const impact = lost * IMPACT_DAMAGE_PER_SPEED;
	damage(world, mover, impact, { ...MOVEMENT, sourceId: other.id });
	damage(world, other, impact, { ...MOVEMENT, sourceId: mover.id });
}

function fly(world: World, entity: Entity, dt: number, solids: readonly Entity[]): void {
	// Равнозамедленное движение за шаг считается точно, чтобы дальность не зависела от тика.
	const surface = cellAt(world.grid, entity.position)?.surface ?? "ground";
	const decel = GROUND_DECELERATION * friction(surface);
	const speed = length(entity.velocity);
	const stops = speed <= decel * dt;
	const travel = stops ? (speed * speed) / (2 * decel) : speed * dt - (decel * dt * dt) / 2;
	const dir = normalize(entity.velocity);
	const next = clampToGrid(world, add(entity.position, scale(dir, travel)));
	const hit = solids.find(
		(o) => o !== entity && overlaps(entity, next, o) && !overlaps(entity, entity.position, o),
	);
	if (hit !== undefined) {
		collide(world, entity, hit);
		return;
	}
	entity.position = next;
	entity.velocity = stops ? ZERO : scale(dir, speed - decel * dt);
}

/** Сквозь деревья и камни не пройти (`Terrain`). */
function blockerAt(entity: Entity, at: Vec2, solids: readonly Entity[]): Entity | undefined {
	return solids.find((o) => o !== entity && o.tags.has("Terrain") && overlaps(entity, at, o));
}

/**
 * Шаг ходьбы. Упёрся в дерево или камень — обходит его по касательной, если может.
 * null — идти некуда.
 */
function walkStep(
	world: World,
	entity: Entity,
	dir: Vec2,
	step: number,
	solids: readonly Entity[],
): Vec2 | null {
	const next = clampToGrid(world, add(entity.position, scale(dir, step)));
	const blocker = blockerAt(entity, next, solids);
	if (blocker === undefined) return next;
	const away = normalize(sub(entity.position, blocker.position));
	const into = dot(dir, away);
	if (into >= 0) return null;
	const tangent = sub(dir, scale(away, into));
	if (length(tangent) < 1e-6) {
		// Идёт точно в центр препятствия: обходить в стабильную сторону.
		return walkStep(world, entity, normalize({ x: -away.y, y: away.x }), step, solids);
	}
	const slid = clampToGrid(world, add(entity.position, scale(normalize(tangent), step)));
	return blockerAt(entity, slid, solids) === undefined ? slid : null;
}

function walk(world: World, entity: Entity, dt: number, solids: readonly Entity[]): void {
	const goal = walkGoal(world, entity);
	if (goal === null) return;
	const left = distance(entity.position, goal.point) - goal.stopAt;
	if (left <= 0) return;
	const step = Math.min(left, entity.stats.moveSpeed * speedFactor(entity) * dt);
	const dir = normalize(sub(goal.point, entity.position));
	const next = walkStep(world, entity, dir, step, solids);
	if (next === null) return;
	entity.state.walkedUnits = distance(entity.position, next);
	if (entity.state.walkedUnits > 0) entity.state.heading = normalize(sub(next, entity.position));
	entity.position = next;
}

export function movementSystem(world: World): void {
	const entities = entitiesInOrder(world);
	const solids = entities.filter(isSolid);
	for (const entity of entities) {
		entity.state.walkedUnits = 0;
		if (!isAlive(entity) || entity.tags.has("Projectile")) continue;
		const dt = localDt(entity);
		if (dt === 0) continue;
		if (length(entity.velocity) > 0) fly(world, entity, dt, solids);
		else if (entity.state.windup === null) walk(world, entity, dt, solids);
	}
}
