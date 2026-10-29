// «Стена ножей» на арене этапа 2 — настоящими героями и законами, без прокачки.
// Хронист замедляет время (L7-01), потом останавливает (L7-02). Тень-без-часов бросает ножи
// издалека: в замедлении они летят вчетверо медленнее и ещё в воздухе, когда время встаёт.
// docs/12-example-builds.md, сборка 1.

import { createMatch } from "@combollect/content";
import { type Entity, issueCommand, lawSlotIndex, type PlannedAction } from "@combollect/core";
import type { Scenario } from "../src/scenario.ts";

const ENEMY = { x: 1110, y: 352 };

function law(hero: Entity, lawId: string, point = ENEMY): PlannedAction {
	return { kind: "useLaw", slot: lawSlotIndex(hero, lawId), target: { kind: "point", point } };
}

/** Закон на всю карту — без цели. */
function globalLaw(hero: Entity, lawId: string): PlannedAction {
	return { kind: "useLaw", slot: lawSlotIndex(hero, lawId), target: { kind: "none" } };
}

export const arenaKnifeWall: Scenario = {
	id: "arena-knife-wall",
	title: "Стена ножей на арене",
	description:
		"Хронист замедляет время, а затем останавливает его. Тень-без-часов вне времени бросает ножи " +
		"во врага с разных сторон: брошенные в замедлении ползут, брошенные в остановке застывают у руки. " +
		"Время возобновляется — все ножи летят разом.",
	defaultSeed: 1,
	durationSec: 10,
	setup(seed) {
		const match = createMatch({ seed, allies: ["chronist", "shadow"], enemy: "butcher" });
		const [chronist, shadow] = match.allies;
		if (chronist === undefined || shadow === undefined) throw new Error("нет героев");
		return { world: match.world, actors: { chronist, shadow, enemy: match.enemy } };
	},
	script: [
		{
			atSec: 0,
			say: "Тень-без-часов выходит на дальнюю позицию к западу от врага",
			run: ({ world, actors }) => {
				issueCommand(world, actors.shadow as Entity, { kind: "move", to: { x: 700, y: 300 } });
			},
		},
		{
			atSec: 1,
			say: "Хронист начинает Замедление времени: мир трещит 1.5 с, это видят все",
			run: ({ world, actors }) => {
				const c = actors.chronist as Entity;
				issueCommand(world, c, globalLaw(c, "L7-01"));
			},
		},
		{
			atSec: 2.6,
			say: "Время ползёт. Тень бросает нож с запада и обходит врага с севера",
			run: ({ world, actors }) => {
				const s = actors.shadow as Entity;
				const go = (x: number, y: number) =>
					issueCommand(world, s, { kind: "move", to: { x, y } }, { queue: true });
				issueCommand(world, s, law(s, "L2-02"));
				// После броска — в сторону с линии полёта: в замедлении свой нож ползёт,
				// на него легко налететь, а он бьёт и того, кто его бросил.
				go(700, 100);
				go(1000, 100);
				issueCommand(world, s, law(s, "L2-02"), { queue: true });
				go(1000, 40);
				go(1250, 40);
				go(1250, 140);
				go(1180, 170);
				issueCommand(world, s, law(s, "L2-02"), { queue: true });
				go(1180, 60);
			},
		},
		{
			atSec: 3.4,
			say: "Хронист начинает Остановку времени",
			run: ({ world, actors }) => {
				const c = actors.chronist as Entity;
				issueCommand(world, c, globalLaw(c, "L7-02"));
			},
		},
	],
};
