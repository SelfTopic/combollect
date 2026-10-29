import type { SpawnSpec } from "@combollect/core";
import { runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, rock, stoneGolem, throne, tree, wolf } from "../src/index.ts";
import { arena, at, cast, must, ready } from "./helpers.ts";

const ghost = (x: number, y: number): SpawnSpec => ({
	name: "Призрак",
	tags: ["Incorporeal", "Mind", "Emotions", "InSpace", "InTime"],
	position: { x, y },
	health: 50,
});

const ALL_LAWS = ["L2-01", "L2-02", "L3-01", "L3-02", "L4-01", "L7-01"] as const;
const mage = (x: number, y: number) =>
	human({ x, y }, { name: "Носитель", laws: ALL_LAWS, lore: { name: "Запас", value: 1000 } });

describe("Импульс (L2-01)", () => {
	test("Импульс: отбрасывает тех, кто в конусе, и не трогает тех, кто позади", () => {
		const { world, e } = arena([
			mage(400, 400),
			wolf({ x: 500, y: 400 }),
			wolf({ x: 300, y: 400 }),
		]);
		cast(world, must(e[0]), "L2-01", at({ x: 600, y: 400 }));
		runSeconds(world, 2);
		expect(e[1]?.position.x).toBeGreaterThan(650);
		expect(e[2]?.position.x).toBe(300);
	});

	test("Импульс: огромного голема отбрасывает вчетверо ближе, чем человека", () => {
		const { world, e } = arena([
			mage(400, 400),
			human({ x: 500, y: 380 }),
			stoneGolem({ x: 500, y: 440 }),
		]);
		cast(world, must(e[0]), "L2-01", at({ x: 600, y: 410 }));
		runSeconds(world, 2);
		const humanFlight = must(e[1]).position.x - 500;
		const golemFlight = must(e[2]).position.x - 500;
		expect(golemFlight / humanFlight).toBeCloseTo(0.25, 1);
	});

	test("Импульс: бесплотного не сдвинуть", () => {
		const { world, e } = arena([mage(400, 400), ghost(500, 400)]);
		cast(world, must(e[0]), "L2-01", at({ x: 600, y: 400 }));
		runSeconds(world, 1);
		expect(e[1]?.position.x).toBe(500);
	});
});

describe("Импульс и местность", () => {
	test("Импульс: камень, дерево и трон вросли в землю — толчок их не сдвигает", () => {
		const { world, e } = arena([
			human({ x: 300, y: 300 }, { name: "Носитель", laws: ["L2-01"] }),
			rock({ x: 380, y: 300 }),
			tree({ x: 340, y: 360 }),
			throne({ x: 340, y: 240 }, "east", "Трон"),
		]);
		const before = e.slice(1).map((x) => must(x).position);
		cast(world, must(e[0]), "L2-01", at({ x: 400, y: 300 }));
		ready(must(e[0]), "L2-01");
		cast(world, must(e[0]), "L2-01", at({ x: 340, y: 360 }));
		ready(must(e[0]), "L2-01");
		cast(world, must(e[0]), "L2-01", at({ x: 340, y: 240 }));
		runSeconds(world, 1);
		expect(e.slice(1).map((x) => must(x).position)).toEqual(before);
	});
});
