// Арена этапа 2 (docs/dev/stage-2.md): одна небольшая карта целиком на экране. Есть вода,
// трава, деревья, камни и по трону на каждом краю. На карте все типы поверхностей,
// чтобы каждому закону было с чем взаимодействовать (docs/09-map.md).

import {
	createGrid,
	createWorld,
	type Entity,
	type Grid,
	type Surface,
	spawn,
	type TeamId,
	type Vec2,
	type World,
} from "@combollect/core";
import { rock, tree } from "./creatures.ts";
import { heroById, heroSpawn } from "./heroes/index.ts";
import { specialInteractions } from "./interactions.ts";
import { allLaws } from "./laws/index.ts";
import { type ThroneRef, throne, throneDestroyed } from "./throne.ts";

export const ARENA_WIDTH = 40;
export const ARENA_HEIGHT = 22;

const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean =>
	x >= x0 && x <= x1 && y >= y0 && y <= y1;

function arenaSurface(x: number, y: number): Surface {
	// Озеро на севере и пруд на юге.
	if (inRect(x, y, 16, 3, 23, 7) && !(x === 16 && y === 3) && !(x === 23 && y === 7))
		return "water";
	if (inRect(x, y, 26, 15, 29, 17)) return "water";
	// Каменистый пол у тронов.
	if (x <= 4 || x >= ARENA_WIDTH - 5) return y >= 6 && y <= 15 ? "stone" : "grass";
	// Лесные полосы по краям и луг.
	if (y <= 2 || y >= ARENA_HEIGHT - 3) return "grass";
	if (inRect(x, y, 8, 12, 13, 17)) return "grass";
	return "ground";
}

export function createArenaGrid(): Grid {
	return createGrid(ARENA_WIDTH, ARENA_HEIGHT, arenaSurface);
}

const cell = (x: number, y: number): Vec2 => ({ x: x * 32 + 16, y: y * 32 + 16 });

const TREES: readonly Vec2[] = [
	...[6, 9, 12, 15, 26, 29, 32].map((x) => cell(x, 1)),
	...[7, 10, 13, 22, 25, 28, 31].map((x) => cell(x, 20)),
	cell(9, 14),
	cell(11, 16),
	cell(12, 13),
];

// Между камнями — проход шире героя.
const ROCKS: readonly Vec2[] = [cell(20, 9), cell(20, 14), cell(14, 10), cell(27, 11)];

export const TEAMS = { west: "west", east: "east" } as const satisfies Record<string, TeamId>;

export const THRONE_POSITIONS: Readonly<Record<TeamId, Vec2>> = {
	west: { x: 80, y: 352 },
	east: { x: ARENA_WIDTH * 32 - 80, y: 352 },
};

export interface MatchOptions {
	readonly seed?: number;
	/** Герои своей команды (id из content/heroes), до трёх. */
	readonly allies: readonly string[];
	/** Герой-враг: стоит у своего трона («AFK»). */
	readonly enemy: string;
}

export interface Match {
	readonly world: World;
	readonly playerTeam: TeamId;
	readonly enemyTeam: TeamId;
	readonly thrones: readonly ThroneRef[];
	readonly allies: readonly Entity[];
	readonly enemy: Entity;
}

const ALLY_SPOTS: readonly Vec2[] = [
	{ x: 200, y: 300 },
	{ x: 220, y: 352 },
	{ x: 200, y: 404 },
];

export function createMatch(options: MatchOptions): Match {
	const thrones: ThroneRef[] = [];
	const world = createWorld({
		seed: options.seed ?? 1,
		grid: createArenaGrid(),
		laws: allLaws,
		interactions: specialInteractions,
		victoryConditions: [throneDestroyed(thrones)],
	});
	for (const position of TREES) spawn(world, tree(position));
	for (const position of ROCKS) spawn(world, rock(position));
	for (const [team, name] of [
		[TEAMS.west, "Трон Запада"],
		[TEAMS.east, "Трон Востока"],
	] as const) {
		const entity = spawn(world, throne(THRONE_POSITIONS[team] ?? { x: 0, y: 0 }, team, name));
		thrones.push({ team, id: entity.id, name });
	}
	const allies = options.allies.slice(0, ALLY_SPOTS.length).map((id, i) => {
		const hero = heroById(id);
		return spawn(world, heroSpawn(hero, ALLY_SPOTS[i] ?? { x: 200, y: 352 }, TEAMS.west));
	});
	const enemyHero = heroById(options.enemy);
	const enemy = spawn(
		world,
		heroSpawn(
			enemyHero,
			{ x: ARENA_WIDTH * 32 - 170, y: 352 },
			TEAMS.east,
			`${enemyHero.name} (враг)`,
		),
	);
	return { world, playerTeam: TEAMS.west, enemyTeam: TEAMS.east, thrones, allies, enemy };
}
