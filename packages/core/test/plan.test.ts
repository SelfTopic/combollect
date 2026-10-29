import { describe, expect, test } from "vitest";
import { addTimeField } from "../src/clock.ts";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds, runTicks } from "../src/testing.ts";
import { IN_TIME, person, testLaws } from "./helpers.ts";

function stoppedPair() {
	const { world, entities } = createTestWorld({
		laws: testLaws,
		entities: [
			person("Хронист", { x: 500, y: 500 }, { outOfTime: true }),
			person("Боец", { x: 100, y: 100 }),
			person("Враг", { x: 300, y: 100 }),
		],
	});
	const [chronist, fighter, enemy] = entities;
	if (chronist === undefined || fighter === undefined || enemy === undefined) throw new Error();
	addTimeField(
		world,
		chronist.id,
		{ factor: 0, durationSec: 2, requires: IN_TIME, excludes: {}, name: "стоп" },
		{},
	);
	runTicks(world, 1);
	return { world, fighter, enemy };
}

describe("План действий", () => {
	test("приказы остановленному попадают в план, а не выполняются", () => {
		const { world, fighter, enemy } = stoppedPair();
		issueCommand(world, fighter, { kind: "move", to: { x: 250, y: 100 } });
		issueCommand(world, fighter, { kind: "attack", targetId: enemy.id });
		runSeconds(world, 1);
		expect(fighter.plan).toHaveLength(2);
		expect(fighter.position).toEqual({ x: 100, y: 100 });
		expect(eventsOf(world, "commandIssued", fighter.id).map((e) => e.after)).toEqual([
			"в план",
			"в план",
		]);
	});

	test("действия, отданные во время остановки, выполняются по порядку после возобновления", () => {
		const { world, fighter, enemy } = stoppedPair();
		issueCommand(world, fighter, { kind: "move", to: { x: 250, y: 100 } });
		issueCommand(world, fighter, { kind: "attack", targetId: enemy.id });
		runSeconds(world, 2);
		expect(enemy.resources.health).toBe(100);
		runSeconds(world, 1.5);
		const steps = eventsOf(world, "planStep", fighter.id).map((e) => e.note);
		expect(steps).toEqual(["идти в (250, 100)", `атаковать #${enemy.id}`]);
		expect(enemy.resources.health).toBe(90);
		expect(fighter.plan).toHaveLength(0);
	});

	test("невозможное действие пропускается, и выполняется следующее", () => {
		const { world, fighter, enemy } = stoppedPair();
		// Закон с подготовкой, нацеленный на того, кто далеко, — невозможно; потом подойти.
		issueCommand(world, fighter, {
			kind: "useLaw",
			slot: 2,
			target: { kind: "entity", id: enemy.id },
		});
		issueCommand(world, fighter, { kind: "move", to: { x: 120, y: 100 } });
		runSeconds(world, 3);
		expect(eventsOf(world, "planSkipped", fighter.id)).toHaveLength(1);
		expect(eventsOf(world, "planSkipped", fighter.id)[0]?.note).toContain("слишком далеко");
		expect(fighter.position).toEqual({ x: 120, y: 100 });
	});

	test("атака на перезарядке пропускается", () => {
		const { world, fighter, enemy } = stoppedPair();
		fighter.position = { x: 260, y: 100 };
		issueCommand(world, fighter, { kind: "attack", targetId: enemy.id });
		issueCommand(world, fighter, { kind: "attack", targetId: enemy.id });
		runSeconds(world, 2.5);
		expect(enemy.resources.health).toBe(90);
		expect(eventsOf(world, "planSkipped", fighter.id)[0]?.note).toContain("перезарядка");
	});

	test("атака на погибшую цель пропускается", () => {
		const { world, fighter, enemy } = stoppedPair();
		issueCommand(world, fighter, { kind: "attack", targetId: enemy.id });
		issueCommand(world, fighter, { kind: "move", to: { x: 100, y: 200 } });
		enemy.resources.health = 0;
		runSeconds(world, 3);
		expect(eventsOf(world, "planSkipped", fighter.id)[0]?.note).toContain("цели нет");
		expect(fighter.position).toEqual({ x: 100, y: 200 });
	});

	test("команда без очереди заменяет план, когда сущность может действовать", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [person("А", { x: 100, y: 100 })],
		});
		const a = entities[0];
		if (a === undefined) throw new Error();
		issueCommand(world, a, { kind: "move", to: { x: 500, y: 100 } });
		issueCommand(world, a, { kind: "move", to: { x: 100, y: 300 } }, { queue: true });
		issueCommand(world, a, { kind: "move", to: { x: 100, y: 150 } });
		expect(a.plan).toEqual([{ kind: "move", to: { x: 100, y: 150 } }]);
	});
});
