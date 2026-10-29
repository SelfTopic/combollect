// Хелперы для тестов и сценариев (docs/dev/testing.md).

import type { Entity } from "./entity.ts";
import type { EventKind, GameEvent } from "./events.ts";
import { createGrid, type Grid, type Surface } from "./grid.ts";
import { type SpawnSpec, spawn } from "./spawn.ts";
import { step } from "./step.ts";
import { TICKS_PER_SECOND } from "./units.ts";
import { createWorld, type LawRegistry, type World } from "./world.ts";

export interface TestGridSpec {
	readonly width: number;
	readonly height: number;
	/** Поверхность клетки по координатам клетки; по умолчанию — земля. */
	readonly surfaceAt?: (x: number, y: number) => Surface;
}

export interface TestWorldSpec {
	readonly seed?: number;
	readonly laws?: LawRegistry;
	readonly grid?: Grid | TestGridSpec;
	readonly entities?: readonly SpawnSpec[];
}

export function createTestWorld(spec: TestWorldSpec = {}): { world: World; entities: Entity[] } {
	const gridSpec = spec.grid ?? { width: 32, height: 32 };
	const grid =
		"cells" in gridSpec
			? gridSpec
			: createGrid(gridSpec.width, gridSpec.height, gridSpec.surfaceAt);
	const world = createWorld({ seed: spec.seed ?? 1, grid, laws: spec.laws ?? new Map() });
	const entities = (spec.entities ?? []).map((s) => spawn(world, s));
	return { world, entities };
}

export function runTicks(world: World, ticks: number): void {
	for (let i = 0; i < ticks; i++) step(world);
}

export function runSeconds(world: World, seconds: number): void {
	runTicks(world, Math.round(seconds * TICKS_PER_SECOND));
}

/** Прокручивать, пока условие не станет истинным (не дольше `maxSeconds`). */
export function runUntil(world: World, condition: () => boolean, maxSeconds = 60): boolean {
	const limit = Math.round(maxSeconds * TICKS_PER_SECOND);
	for (let i = 0; i < limit; i++) {
		if (condition()) return true;
		step(world);
	}
	return condition();
}

export function eventsOf(world: World, kind: EventKind, target?: number): GameEvent[] {
	return world.events.entries.filter(
		(e) => e.kind === kind && (target === undefined || e.target === target),
	);
}
