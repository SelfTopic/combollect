// Появление сущностей в мире.

import { updateBurning } from "./api/effects.ts";
import { computeRate } from "./clock.ts";
import type { Entity, ProjectileData, TeamId, Wetness } from "./entity.ts";
import type { Cause, LawId } from "./events.ts";
import { dryingTime } from "./physics.ts";
import type { TagId } from "./tags.ts";
import { type Units, type Vec2, ZERO } from "./units.ts";
import { emit, type World } from "./world.ts";

export interface SpawnSpec {
	readonly name: string;
	readonly tags: readonly TagId[];
	readonly team?: TeamId;
	readonly position: Vec2;
	readonly velocity?: Vec2;
	readonly health: number;
	readonly radiusUnits?: Units;
	readonly moveSpeed?: number;
	readonly laws?: readonly LawId[];
	readonly lore?: { readonly name: string; readonly value: number; readonly regenPerSec?: number };
	readonly temperature?: number;
	readonly wetness?: Wetness;
	readonly projectile?: ProjectileData;
}

export const DEFAULT_RADIUS: Units = 16;
export const DEFAULT_MOVE_SPEED = 300;

export function spawn(world: World, spec: SpawnSpec, cause: Cause = {}): Entity {
	const tags = new Set(spec.tags);
	const entity: Entity = {
		id: world.nextId++,
		name: spec.name,
		tags,
		team: spec.team ?? null,
		state: {
			temperature: spec.temperature ?? 0,
			wetness: spec.wetness ?? "dry",
			dryingSec: dryingTime(spec.wetness ?? "dry"),
			evaporationHeat: 0,
			burning: false,
			body: tags.has("Limbs") ? { head: 100, torso: 100, arms: 100, legs: 100 } : null,
			concussionSec: 0,
			windup: null,
			pending: [],
			removed: false,
		},
		resources: {
			health: spec.health,
			maxHealth: spec.health,
			lore:
				spec.lore === undefined
					? null
					: {
							name: spec.lore.name,
							value: spec.lore.value,
							max: spec.lore.value,
							regenPerSec: spec.lore.regenPerSec ?? 0,
						},
		},
		position: spec.position,
		velocity: spec.velocity ?? ZERO,
		clock: { rate: 1 },
		laws: (spec.laws ?? []).map((lawId) => {
			const def = world.laws.get(lawId);
			if (def === undefined) throw new Error(`Неизвестный закон ${lawId}`);
			return { lawId, cooldownSec: 0, params: { ...def.params } };
		}),
		plan: [],
		stats: {
			radiusUnits: spec.radiusUnits ?? DEFAULT_RADIUS,
			moveSpeed: spec.moveSpeed ?? DEFAULT_MOVE_SPEED,
		},
		projectile: spec.projectile ?? null,
	};
	// Новая сущность сразу живёт по своим часам: нож, брошенный в остановленном времени,
	// застывает, едва покинув руку (docs/06-time-system.md, правило 1).
	entity.clock.rate = computeRate(world, entity);
	world.entities.set(entity.id, entity);
	emit(world, {
		kind: "entitySpawned",
		target: entity.id,
		cause,
		note: entity.name,
		after: entity.clock.rate,
		at: entity.position,
	});
	// Появившееся уже раскалённым горит сразу, даже если его время стоит.
	updateBurning(world, entity, cause);
	return entity;
}
