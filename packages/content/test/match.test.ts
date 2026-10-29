import { type Entity, issueCommand, type LawTarget, SURFACES } from "@combollect/core";
import { eventsOf, runSeconds, runUntil } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import {
	ARENA_WIDTH,
	butcher,
	chronist,
	createMatch,
	shadow,
	stage2Heroes,
	THRONE_TAGS,
} from "../src/index.ts";
import { must, slotOf } from "./helpers.ts";

const full = () => createMatch({ allies: ["chronist", "shadow", "butcher"], enemy: "butcher" });

function throneOf(match: ReturnType<typeof full>, team: string): Entity {
	return must(match.world.entities.get(must(match.thrones.find((t) => t.team === team)).id));
}

function use(match: ReturnType<typeof full>, hero: Entity, lawId: string, target: LawTarget) {
	issueCommand(match.world, hero, { kind: "useLaw", slot: slotOf(hero, lawId), target });
}

describe("Арена", () => {
	test("Арена: на карте есть вода, трава, камень и земля, деревья и камни", () => {
		const { world } = full();
		const surfaces = new Set(world.grid.cells.map((c) => c.surface));
		for (const s of ["water", "grass", "stone", "ground"] as const)
			expect(surfaces.has(s)).toBe(true);
		expect(SURFACES).toContain("ice");
		const names = [...world.entities.values()].map((e) => e.name);
		expect(names.filter((n) => n === "Дерево").length).toBeGreaterThan(5);
		expect(names.filter((n) => n === "Камень").length).toBeGreaterThan(2);
	});

	test("Арена: по трону на каждом краю, враг стоит у своего трона", () => {
		const match = full();
		const west = throneOf(match, "west");
		const east = throneOf(match, "east");
		expect(west.position.x).toBeLessThan(160);
		expect(east.position.x).toBeGreaterThan(ARENA_WIDTH * 32 - 160);
		expect(match.enemy.team).toBe("east");
		expect(Math.abs(match.enemy.position.x - east.position.x)).toBeLessThan(150);
	});

	test("Арена: свои герои — в своей команде, у своего трона", () => {
		const match = full();
		expect(match.allies.map((h) => h.name)).toEqual(["Хронист", "Тень-без-часов", "Мясник"]);
		expect(match.allies.every((h) => h.team === "west" && h.position.x < 300)).toBe(true);
		expect(match.enemy.name).toBe("Мясник (враг)");
	});

	test("Арена: одинаковый сид и приказы — одинаковый журнал", () => {
		const play = () => {
			const match = full();
			issueCommand(match.world, must(match.allies[2]), {
				kind: "attack",
				targetId: match.enemy.id,
			});
			runSeconds(match.world, 8);
			return JSON.stringify(match.world.events.entries);
		};
		expect(play()).toBe(play());
	});
});

describe("Трон", () => {
	test("Трон: метки по заданию этапа 2", () => {
		const west = throneOf(full(), "west");
		for (const tag of [
			"Structure",
			"Material",
			"Atomic",
			"InTime",
			"Mindless",
			"Nonflammable",
			"Mass:Huge",
			"Terrain",
		] as const) {
			expect(west.tags.has(tag)).toBe(true);
		}
		expect(THRONE_TAGS).not.toContain("Limbs");
	});

	test("Трон: стоит в остановленном времени, как всё во времени", () => {
		const match = full();
		const chron = must(match.allies[0]);
		use(match, chron, "L7-02", { kind: "none" });
		runSeconds(match.world, 1.6);
		expect(throneOf(match, "east").clock.rate).toBe(0);
		expect(throneOf(match, "west").clock.rate).toBe(0);
	});

	test("Трон: перелом и кровотечение на него не действуют — у него нет костей и крови", () => {
		const match = full();
		const b = must(match.allies[2]);
		const own = throneOf(match, "west");
		b.position = { x: own.position.x + 60, y: own.position.y };
		use(match, b, "L1-01", { kind: "entity", id: own.id });
		runSeconds(match.world, 1);
		use(match, b, "L1-02", { kind: "entity", id: own.id });
		runSeconds(match.world, 1);
		expect(own.state.wounds).toHaveLength(0);
		expect(own.resources.health).toBe(own.resources.maxHealth);
	});

	test("Трон: удар бьёт и свой трон — закон не знает своих", () => {
		const match = full();
		const b = must(match.allies[2]);
		const own = throneOf(match, "west");
		b.position = { x: own.position.x + 60, y: own.position.y };
		issueCommand(match.world, b, { kind: "attack", targetId: own.id });
		runSeconds(match.world, 1.1);
		expect(own.resources.health).toBe(own.resources.maxHealth - 10);
	});
});

describe("Цель матча: уничтожить вражеский трон", () => {
	test("Матч: дойти до врага, убить его, сломать трон — победа своей команды", () => {
		const match = full();
		const { world } = match;
		for (const hero of match.allies)
			issueCommand(world, hero, { kind: "attack", targetId: match.enemy.id, hold: true });
		expect(runUntil(world, () => eventsOf(world, "death", match.enemy.id).length > 0, 120)).toBe(
			true,
		);
		const east = throneOf(match, "east");
		for (const hero of match.allies)
			issueCommand(world, hero, { kind: "attack", targetId: east.id, hold: true });
		expect(runUntil(world, () => world.result !== null, 240)).toBe(true);
		expect(world.result?.winner).toBe("west");
		expect(world.result?.reason).toContain("Трон Востока");
		expect(eventsOf(world, "matchEnded")).toHaveLength(1);
	});
});

describe("Герои этапа 2", () => {
	test("Герои: у каждого базовая атака — закон «Удар» (L2-00)", () => {
		for (const hero of stage2Heroes) {
			expect(hero.laws.find((l) => l.key === null)?.lawId).toBe("L2-00");
		}
	});

	test("Герои: Хронист вне времени, якорь времени, две травмы; законы L7-01 и L7-02", () => {
		expect(chronist.tags).toEqual(
			expect.arrayContaining(["OutOfTime", "TimeAnchor", "Trauma:Loss", "Trauma:Loneliness"]),
		);
		expect(chronist.tags).not.toContain("InTime");
		expect(chronist.laws.map((l) => l.lawId)).toEqual(["L2-00", "L7-01", "L7-02"]);
		expect(chronist.laws.find((l) => l.lawId === "L7-02")?.temporary).toBeDefined();
	});

	test("Герои: Тень-без-часов вне времени и лёгкая; законы L2-02 и L1-02", () => {
		expect(shadow.tags).toEqual(
			expect.arrayContaining(["OutOfTime", "Mass:Light", "Trauma:Captivity"]),
		);
		expect(shadow.tags).not.toContain("Mass:Medium");
		expect(shadow.laws.map((l) => l.lawId)).toEqual(["L2-00", "L2-02", "L1-02"]);
	});

	test("Герои: Мясник во времени, несгибаем, регенерирует, тяжёлый; законы L1-01, L1-02, L2-01", () => {
		expect(butcher.tags).toEqual(
			expect.arrayContaining(["InTime", "IronWill", "Regenerating", "Mass:Heavy"]),
		);
		expect(butcher.tags.some((t) => t.startsWith("Trauma:"))).toBe(false);
		expect(butcher.laws.map((l) => l.lawId)).toEqual(["L2-00", "L1-01", "L1-02", "L2-01"]);
	});

	test("Хронист: хрупкое тело — перелом ломает ему руки на 52% вместо 40%", () => {
		const match = createMatch({ allies: ["butcher"], enemy: "chronist" });
		const b = must(match.allies[0]);
		const c = match.enemy;
		b.position = { x: c.position.x - 40, y: c.position.y };
		use(match, b, "L1-01", {
			kind: "entity",
			id: c.id,
			aim: { x: c.position.x, y: c.position.y - 8 },
		});
		runSeconds(match.world, 0.5);
		expect(c.state.body?.arms).toBeCloseTo(48);
	});

	test("Хронист: сломал руки — нет жеста, Остановку времени не применить", () => {
		const match = createMatch({ allies: ["butcher"], enemy: "chronist" });
		const b = must(match.allies[0]);
		const c = match.enemy;
		b.position = { x: c.position.x - 40, y: c.position.y };
		for (let i = 0; i < 2; i++) {
			const slot = b.laws[slotOf(b, "L1-01")];
			if (slot !== undefined) slot.cooldownSec = 0;
			use(match, b, "L1-01", {
				kind: "entity",
				id: c.id,
				aim: { x: c.position.x, y: c.position.y - 8 },
			});
			runSeconds(match.world, 0.5);
		}
		expect(c.state.body?.arms).toBe(0);
		use(match, c, "L7-02", { kind: "none" });
		runSeconds(match.world, 0.1);
		expect(eventsOf(match.world, "planSkipped", c.id)[0]?.note).toContain("руки сломаны");
	});

	test("Хронист: «Хронос» стоя восстанавливается быстрее, чем на ходу", () => {
		const match = createMatch({ allies: ["chronist", "chronist"], enemy: "shadow" });
		const [still, walker] = [must(match.allies[0]), must(match.allies[1])];
		for (const h of [still, walker]) if (h.resources.lore !== null) h.resources.lore.value = 0;
		issueCommand(match.world, walker, { kind: "move", to: { x: 1000, y: 404 } });
		runSeconds(match.world, 2);
		expect(still.resources.lore?.value).toBeCloseTo(4, 1);
		expect(walker.resources.lore?.value).toBeLessThan(1);
	});

	test("Мясник: «Выносливость» восстанавливается быстро", () => {
		expect(butcher.resource.regenPerSec).toBeGreaterThan(shadow.resource.regenPerSec ?? 0);
	});
});
