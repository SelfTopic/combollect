import { describe, expect, test } from "vitest";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds } from "../src/testing.ts";
import { person, testLaws } from "./helpers.ts";

function pair(bHealth = 100) {
	const { world, entities } = createTestWorld({
		laws: testLaws,
		entities: [
			person("А", { x: 100, y: 100 }),
			person("Б", { x: 400, y: 100 }, { health: bHealth }),
		],
	});
	const [a, b] = entities;
	if (a === undefined || b === undefined) throw new Error();
	return { world, a, b };
}

describe("Атака до смерти цели", () => {
	test("План: «атаковать» без удержания — один удар", () => {
		const { world, a, b } = pair();
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 6);
		expect(b.resources.health).toBe(90);
	});

	test("План: «атаковать, пока жива» — подходит и бьёт, ожидая перезарядку", () => {
		const { world, a, b } = pair();
		issueCommand(world, a, { kind: "attack", targetId: b.id, hold: true });
		runSeconds(world, 6);
		// 1 с на подход, дальше удар каждые 2 с перезарядки тестового удара.
		expect(b.resources.health).toBeLessThanOrEqual(80);
		expect(eventsOf(world, "planSkipped", a.id)).toHaveLength(0);
	});

	test("План: «атаковать, пока жива» кончается со смертью цели, и план идёт дальше", () => {
		const { world, a, b } = pair(15);
		issueCommand(world, a, { kind: "attack", targetId: b.id, hold: true });
		issueCommand(world, a, { kind: "move", to: { x: 100, y: 600 } }, { queue: true });
		runSeconds(world, 8);
		expect(eventsOf(world, "death", b.id)).toHaveLength(1);
		expect(a.position.y).toBeGreaterThan(500);
	});

	test("Ходьба: подошедший для удара не застывает на самой границе дальности", () => {
		const { world, a, b } = pair();
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 2);
		expect(b.resources.health).toBe(90);
	});
});

describe("Обход препятствий", () => {
	test("Ходьба: упёршись в камень, идущий обходит его и доходит до цели", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("А", { x: 100, y: 300 }),
				{
					name: "Камень",
					tags: ["Material", "Terrain", "Mass:Huge"],
					position: { x: 300, y: 300 },
					health: 1000,
					radiusUnits: 24,
				},
			],
		});
		const a = entities[0];
		if (a === undefined) throw new Error();
		issueCommand(world, a, { kind: "move", to: { x: 500, y: 300 } });
		runSeconds(world, 3);
		expect(a.position.x).toBeCloseTo(500, 0);
	});
});

describe("Подойти и применить", () => {
	test("План: закон с «подойти» сначала подходит к далёкой цели, потом применяется", () => {
		const { world, a, b } = pair();
		issueCommand(world, a, {
			kind: "useLaw",
			slot: 0,
			target: { kind: "entity", id: b.id },
			approach: true,
		});
		runSeconds(world, 2);
		expect(b.resources.health).toBe(90);
		expect(eventsOf(world, "planSkipped", a.id)).toHaveLength(0);
	});

	test("План: тот же закон без «подойти» на далёкую цель пропускается", () => {
		const { world, a, b } = pair();
		issueCommand(world, a, { kind: "useLaw", slot: 0, target: { kind: "entity", id: b.id } });
		runSeconds(world, 2);
		expect(b.resources.health).toBe(100);
		expect(eventsOf(world, "planSkipped", a.id)[0]?.note).toContain("слишком далеко");
	});

	test("Журнал: применение закона записывает, куда он направлен", () => {
		const { world, a, b } = pair();
		b.position = { x: 140, y: 100 };
		issueCommand(world, a, { kind: "useLaw", slot: 0, target: { kind: "entity", id: b.id } });
		runSeconds(world, 0.5);
		expect(eventsOf(world, "lawApplied", a.id)[0]?.at).toEqual({ x: 140, y: 100 });
	});
});
