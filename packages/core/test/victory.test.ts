import { describe, expect, test } from "vitest";
import { isAlive } from "../src/entity.ts";
import { issueCommand } from "../src/systems/plan.ts";
import { createTestWorld, eventsOf, runSeconds, runTicks } from "../src/testing.ts";
import type { VictoryCondition } from "../src/victory.ts";
import { person, testLaws } from "./helpers.ts";

/** Тестовое условие: команда «свет» побеждает, когда «Б» больше нет. */
const bFalls: VictoryCondition = (world) => {
	const b = [...world.entities.values()].find((e) => e.name === "Б");
	return b === undefined || !isAlive(b) ? { winner: "свет", reason: "Б пал" } : null;
};

function duel(victoryConditions: readonly VictoryCondition[]) {
	const { world, entities } = createTestWorld({
		laws: testLaws,
		victoryConditions,
		entities: [
			person("А", { x: 100, y: 100 }, { team: "свет" }),
			person("Б", { x: 140, y: 100 }, { team: "тьма", health: 10 }),
		],
	});
	const [a, b] = entities;
	if (a === undefined || b === undefined) throw new Error();
	return { world, a, b };
}

describe("Команды и условия победы", () => {
	test("Команда: служебное поле, по умолчанию сущность ничья", () => {
		const { entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("А", { x: 100, y: 100 }, { team: "свет" }),
				person("Ничей", { x: 1, y: 1 }),
			],
		});
		expect(entities[0]?.team).toBe("свет");
		expect(entities[1]?.team).toBeNull();
	});

	test("Команда: закон бьёт союзника по команде так же, как врага", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [
				person("А", { x: 100, y: 100 }, { team: "свет" }),
				person("Союзник", { x: 140, y: 100 }, { team: "свет" }),
			],
		});
		const [a, ally] = entities;
		if (a === undefined || ally === undefined) throw new Error();
		issueCommand(world, a, { kind: "attack", targetId: ally.id });
		runSeconds(world, 0.5);
		expect(ally.resources.health).toBe(90);
	});

	test("Условие победы: без условий матч не кончается", () => {
		const { world, a, b } = duel([]);
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 2);
		expect(eventsOf(world, "death", b.id)).toHaveLength(1);
		expect(world.result).toBeNull();
	});

	test("Условие победы: проверяется после всех систем — смерть в этом же тике заканчивает матч", () => {
		const { world, a, b } = duel([bFalls]);
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 1);
		const ended = eventsOf(world, "matchEnded")[0];
		expect(ended?.tick).toBe(eventsOf(world, "death", b.id)[0]?.tick);
		expect(ended?.after).toBe("свет");
		expect(ended?.note).toBe("Б пал");
		expect(world.result).toEqual({ winner: "свет", reason: "Б пал" });
	});

	test("Условие победы: после итога мир больше не тикает", () => {
		const { world, a, b } = duel([bFalls]);
		issueCommand(world, a, { kind: "attack", targetId: b.id });
		runSeconds(world, 1);
		const tick = world.tick;
		const position = a.position;
		issueCommand(world, a, { kind: "move", to: { x: 600, y: 600 } });
		runTicks(world, 30);
		expect(world.tick).toBe(tick);
		expect(a.position).toEqual(position);
	});

	test("Условие победы: срабатывает первое по порядку", () => {
		const other: VictoryCondition = () => ({ winner: "тьма", reason: "другое" });
		const { world } = duel([other, bFalls]);
		runTicks(world, 1);
		expect(world.result?.winner).toBe("тьма");
		expect(eventsOf(world, "matchEnded")).toHaveLength(1);
	});
});
