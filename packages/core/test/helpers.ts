// Простые законы и существа только для тестов ядра: ядро не знает законов из content.

import type { LawDef } from "../src/law.ts";
import type { SpawnSpec } from "../src/spawn.ts";
import type { TagId } from "../src/tags.ts";
import type { Vec2 } from "../src/units.ts";

export const testStrike: LawDef = {
	id: "T-STRIKE",
	name: "Тестовый удар",
	tier: 2,
	requires: { all: ["Material"] },
	excludes: {},
	form: "melee",
	windup: 0,
	cooldown: 2,
	cost: { resource: 0, lore: null },
	gesture: true,
	basicAttack: true,
	params: { rangeUnits: 40, damage: 10 },
	apply(ctx) {
		if (ctx.target.kind !== "entity") return;
		const target = ctx.world.entities.get(ctx.target.id);
		if (target !== undefined && ctx.affects(target)) ctx.damage(target, ctx.params.damage ?? 0);
	},
};

export const testPush: LawDef = {
	id: "T-PUSH",
	name: "Тестовый толчок",
	tier: 2,
	requires: { all: ["Material"] },
	excludes: {},
	form: "melee",
	windup: 0,
	cooldown: 1,
	cost: { resource: 0, lore: null },
	gesture: true,
	basicAttack: false,
	params: { rangeUnits: 40, distance: 100 },
	apply(ctx) {
		if (ctx.target.kind !== "entity") return;
		const target = ctx.world.entities.get(ctx.target.id);
		if (target === undefined || !ctx.affects(target)) return;
		const dir = {
			x: target.position.x - ctx.bearer.position.x,
			y: target.position.y - ctx.bearer.position.y,
		};
		ctx.push(target, dir, ctx.params.distance ?? 0);
	},
};

export const testWindup: LawDef = {
	...testStrike,
	id: "T-WINDUP",
	name: "Тестовый замах",
	windup: 1,
	basicAttack: false,
};

export const testLaws = new Map<string, LawDef>([
	[testStrike.id, testStrike],
	[testPush.id, testPush],
	[testWindup.id, testWindup],
]);

const HUMAN: readonly TagId[] = [
	"Material",
	"Living",
	"Limbs",
	"WarmBlooded",
	"Flammable",
	"Mass:Medium",
];

export function person(
	name: string,
	position: Vec2,
	extra: Partial<SpawnSpec> & { outOfTime?: boolean } = {},
): SpawnSpec {
	const { outOfTime, ...rest } = extra;
	return {
		name,
		tags: [...HUMAN, outOfTime === true ? "OutOfTime" : "InTime"],
		position,
		health: 100,
		laws: ["T-STRIKE", "T-PUSH", "T-WINDUP"],
		...rest,
	};
}

export const IN_TIME = { all: ["InTime"] } as const satisfies { all: readonly TagId[] };
