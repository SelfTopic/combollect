// «Стена ножей»: человек вне времени бросает ножи в остановленном времени; ножи застывают,
// покинув руку, а после возобновления летят одновременно. docs/12-example-builds.md, сборка 1.
//
// Закона «Остановка времени» (L7-02) на этапе 1 нет, поэтому остановку делает сценарий:
// поле ×0 от Хрониста — ровно то, что сделал бы закон.

import { human, outOfTimeHuman, stage1Laws } from "@combollect/content";
import {
	addTimeField,
	createGrid,
	createWorld,
	type Entity,
	issueCommand,
	spawn,
} from "@combollect/core";
import type { Scenario } from "../src/scenario.ts";

const THROW = 1;
const enemyAt = { x: 640, y: 400 };
const aim = { kind: "point", point: enemyAt } as const;

export const knifeWall: Scenario = {
	id: "knife-wall",
	title: "Стена ножей",
	description:
		"Хронист останавливает время (поле ×0 на 3 с его часов). Тень-без-часов вне времени обходит врага " +
		"и бросает ножи с четырёх сторон: каждый нож застывает, едва покинув руку. Враг видит это, " +
		"но может только составить план бегства. Время возобновляется — все ножи и бегство врага " +
		"начинаются в один и тот же миг.",
	defaultSeed: 1,
	durationSec: 6,
	setup(seed) {
		const world = createWorld({ seed, grid: createGrid(30, 25), laws: stage1Laws });
		const chronist = spawn(world, outOfTimeHuman({ x: 200, y: 700 }, { name: "Хронист" }));
		const shadow = spawn(
			world,
			outOfTimeHuman(
				{ x: 420, y: 400 },
				{ name: "Тень-без-часов", laws: ["L2-02"], lore: { name: "Выносливость", value: 100 } },
			),
		);
		// Прокачка из сборки: три ножа за бросок, перезарядка короче.
		const knives = shadow.laws[THROW];
		if (knives !== undefined)
			Object.assign(knives.params, { count: 3, spreadDeg: 6, cooldownSec: 0.2 });
		const enemy = spawn(world, human({ x: enemyAt.x, y: enemyAt.y }, { name: "Враг" }));
		const ally = spawn(world, human({ x: 300, y: 650 }, { name: "Мясник (союзник во времени)" }));
		return { world, actors: { chronist, shadow, enemy, ally } };
	},
	script: [
		{
			atSec: 0.5,
			say: "Хронист останавливает время: поле ×0 для всех во времени на 3 с его часов",
			run: ({ world, actors }) => {
				const chronist = actors.chronist as Entity;
				addTimeField(
					world,
					chronist.id,
					{
						factor: 0,
						durationSec: 3,
						requires: { all: ["InTime"] },
						excludes: { any: ["OutOfTime"] },
						name: "Остановка времени",
					},
					{ sourceId: chronist.id },
				);
			},
		},
		{
			atSec: 0.6,
			say: "Тень-без-часов обходит врага и бросает ножи с запада, севера, востока и юга",
			run: ({ world, actors }) => {
				const shadow = actors.shadow as Entity;
				const plan = [
					{ x: 640, y: 300 },
					{ x: 740, y: 400 },
					{ x: 640, y: 500 },
				];
				issueCommand(world, shadow, { kind: "useLaw", slot: THROW, target: aim });
				for (const to of plan) {
					issueCommand(world, shadow, { kind: "move", to }, { queue: true });
					issueCommand(
						world,
						shadow,
						{ kind: "useLaw", slot: THROW, target: aim },
						{ queue: true },
					);
				}
				// Отойти с линий полёта собственных ножей: они бьют и того, кто их бросил.
				issueCommand(world, shadow, { kind: "move", to: { x: 520, y: 560 } }, { queue: true });
			},
		},
		{
			atSec: 1,
			say: "Враг видит ножи и составляет план: бежать на восток",
			run: ({ world, actors }) => {
				issueCommand(world, actors.enemy as Entity, { kind: "move", to: { x: 900, y: 400 } });
			},
		},
		{
			atSec: 1.2,
			say: "Союзник во времени тоже стоит: ему тоже можно только составить план",
			run: ({ world, actors }) => {
				issueCommand(world, actors.ally as Entity, { kind: "move", to: { x: 500, y: 450 } });
			},
		},
	],
};
