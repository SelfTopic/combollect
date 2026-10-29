// «Лужа и молния»: ток бьёт всех в луже — и своих тоже; замёрзшая лужа ток не проводит.
// docs/05-interactions.md: «Вода/Мокрый + Разряд», «Стужа + Лужа».

import { human, stage1Laws, wolf } from "@combollect/content";
import {
	createGrid,
	createWorld,
	type Entity,
	issueCommand,
	nextFloat,
	spawn,
} from "@combollect/core";
import type { Scenario } from "../src/scenario.ts";

/** Лужа: клетки воды в столбцах 6–13, строках 4–8. */
const isPuddle = (x: number, y: number): boolean => x >= 6 && x <= 13 && y >= 4 && y <= 8;

export const puddleLightning: Scenario = {
	id: "puddle-lightning",
	title: "Лужа и молния",
	description:
		"Маг на берегу бьёт Разрядом в лужу: ток проходит по воде и бьёт всех, кто в ней стоит, " +
		"включая его союзника. Потом маг замораживает лужу Стужей и бьёт снова — лёд ток не проводит.",
	defaultSeed: 7,
	durationSec: 8,
	setup(seed) {
		const grid = createGrid(20, 12, (x, y) => (isPuddle(x, y) ? "water" : "ground"));
		const world = createWorld({ seed, grid, laws: stage1Laws });
		const mage = spawn(
			world,
			human(
				{ x: 100, y: 200 },
				{ name: "Маг", laws: ["L4-01", "L3-02"], lore: { name: "Запас", value: 200 } },
			),
		);
		const ally = spawn(world, human({ x: 240, y: 200 }, { name: "Союзник мага" }));
		// Волки забрели в лужу в случайных местах: случайность — только из сида мира.
		const wolves: Entity[] = [];
		for (let i = 0; i < 3; i++) {
			const x = 7 * 32 + nextFloat(world.rng) * 6 * 32;
			const y = 4 * 32 + 8 + nextFloat(world.rng) * 4 * 32;
			wolves.push(spawn(world, wolf({ x, y }, { name: "Волк" })));
		}
		const dryWolf = spawn(world, wolf({ x: 300, y: 340 }, { name: "Волк на берегу" }));
		return { world, actors: { mage, ally, dryWolf, wolf1: wolves[0] as Entity } };
	},
	script: [
		{
			atSec: 0.5,
			say: "Маг бьёт Разрядом в середину лужи",
			run: ({ world, actors }) => {
				const mage = actors.mage as Entity;
				issueCommand(world, mage, {
					kind: "useLaw",
					slot: 1,
					target: { kind: "point", point: { x: 320, y: 200 } },
				});
			},
		},
		{
			atSec: 2,
			say: "Маг замораживает лужу Стужей (прокачанный радиус 160)",
			run: ({ world, actors }) => {
				const mage = actors.mage as Entity;
				const frost = mage.laws[2];
				if (frost !== undefined) frost.params.radiusUnits = 160;
				issueCommand(world, mage, {
					kind: "useLaw",
					slot: 2,
					target: { kind: "point", point: { x: 320, y: 200 } },
				});
			},
		},
		{
			atSec: 6,
			say: "Перезарядка прошла: маг снова бьёт Разрядом в замёрзшую лужу",
			run: ({ world, actors }) => {
				const mage = actors.mage as Entity;
				issueCommand(world, mage, {
					kind: "useLaw",
					slot: 1,
					target: { kind: "point", point: { x: 320, y: 200 } },
				});
			},
		},
	],
};
