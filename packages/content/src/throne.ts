// Трон — цель матча (docs/15-match-goals.md). Обычная сущность мира со своими метками,
// поэтому на него честно действуют все законы: он стоит в остановленном времени,
// не поддаётся психике, не горит, его не сдвинуть.

import {
	type EntityId,
	isAlive,
	type SpawnSpec,
	type TagId,
	type TeamId,
	type Vec2,
	type VictoryCondition,
} from "@combollect/core";

// Метки — по docs/dev/stage-2.md; `InSpace` — «по умолчанию у всех» (docs/02-atoms.md).
export const THRONE_TAGS: readonly TagId[] = [
	"Structure",
	"Material",
	"Atomic",
	"InTime",
	"InSpace",
	"Mindless",
	"Nonflammable",
	"Mass:Huge",
	"Terrain",
];

/** Здоровье трона. ДОПУЩЕНИЕ, см. docs/dev/decisions.md. */
export const THRONE_HEALTH = 600;
export const THRONE_RADIUS = 40;

export function throne(position: Vec2, team: TeamId, name: string): SpawnSpec {
	return {
		name,
		tags: THRONE_TAGS,
		team,
		position,
		health: THRONE_HEALTH,
		radiusUnits: THRONE_RADIUS,
		moveSpeed: 0,
	};
}

export interface ThroneRef {
	readonly team: TeamId;
	readonly id: EntityId;
	readonly name: string;
}

/**
 * Условие победы «трон уничтожен»: пал трон команды — побеждают те, чей трон стоит.
 * Пали все троны в один тик — ничья.
 */
export function throneDestroyed(thrones: readonly ThroneRef[]): VictoryCondition {
	return (world) => {
		const fallen = thrones.filter((t) => {
			const entity = world.entities.get(t.id);
			return entity === undefined || !isAlive(entity);
		});
		if (fallen.length === 0) return null;
		const standing = [...new Set(thrones.filter((t) => !fallen.includes(t)).map((t) => t.team))];
		const reason = `${fallen.map((t) => t.name).join(", ")} уничтожен`;
		if (standing.length === 0) return { winner: null, reason: `${reason} — ничья` };
		if (standing.length > 1) return null;
		return { winner: standing[0] ?? null, reason };
	};
}
