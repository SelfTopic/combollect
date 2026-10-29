import { describe, expect, test } from "vitest";
import { damageZone } from "../src/api/deliver.ts";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds } from "../src/testing.ts";
import { person, testLaws } from "./helpers.ts";

function one() {
	const { world, entities } = createTestWorld({
		laws: testLaws,
		entities: [person("А", { x: 100, y: 100 }), person("Б", { x: 140, y: 100 })],
	});
	const [a, b] = entities;
	if (a === undefined || b === undefined) throw new Error();
	return { world, a, b };
}

describe("Тело", () => {
	test("сломанные ноги: только ползком, 30% скорости", () => {
		const { world, a } = one();
		damageZone(world, a, "legs", 100, {});
		issueCommand(world, a, { kind: "move", to: { x: 100, y: 900 } });
		runSeconds(world, 1);
		expect(a.position.y - 100).toBeCloseTo(300 * 0.3, 0);
	});

	test("голова 0%: сотрясение, законы применять нельзя", () => {
		const { world, a, b } = one();
		damageZone(world, a, "head", 100, {});
		expect(eventsOf(world, "concussion", a.id)).toHaveLength(1);
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 0.2);
		expect(b.resources.health).toBe(100);
		expect(eventsOf(world, "planSkipped", a.id)[0]?.note).toContain("сотрясение");
	});

	test("сотрясение проходит через полторы секунды своего времени", () => {
		const { world, a, b } = one();
		damageZone(world, a, "head", 100, {});
		runSeconds(world, 1.6);
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 0.2);
		expect(b.resources.health).toBe(90);
	});

	test("сломанные руки: закон с жестом применить нельзя", () => {
		const { world, a, b } = one();
		damageZone(world, a, "arms", 100, {});
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 0.2);
		expect(b.resources.health).toBe(100);
		expect(eventsOf(world, "planSkipped", a.id)[0]?.note).toContain("руки");
	});

	test("сотрясение сбивает подготовку закона", () => {
		const { world, a, b } = one();
		issueCommand(world, a, { kind: "useLaw", slot: 2, target: { kind: "entity", id: b.id } });
		runSeconds(world, 0.5);
		damageZone(world, a, "head", 100, {});
		runSeconds(world, 1);
		expect(eventsOf(world, "windupInterrupted", a.id)).toHaveLength(1);
		expect(b.resources.health).toBe(100);
	});

	test("торс — основа здоровья: урон здоровью снижает целостность торса", () => {
		const { world, a } = one();
		damageZone(world, a, "torso", 25, {});
		expect(a.resources.health).toBe(75);
		expect(a.state.body?.torso).toBe(75);
	});
});
