import { describe, expect, test } from "vitest";
import { damage } from "../src/api/deliver.ts";
import { applyHealing } from "../src/api/effects.ts";
import type { SpecialInteraction } from "../src/interaction.ts";
import { createTestWorld, eventsOf } from "../src/testing.ts";
import { person, testLaws } from "./helpers.ts";

// Тестовое взаимодействие: всякий урон с причиной «T-STRIKE» тут же лечится наполовину.
const halfHeal: SpecialInteraction = {
	row: "Тестовый удар + Здоровье",
	description: "проверка механизма",
	react(world, event) {
		if (event.kind !== "health" || event.cause.lawId !== "T-STRIKE" || event.target === undefined)
			return;
		const target = world.entities.get(event.target);
		const lost = Number(event.before) - Number(event.after);
		if (target !== undefined && lost > 0) applyHealing(world, target, lost / 2, { system: "body" });
	},
};

describe("Особые взаимодействия", () => {
	test("Особое взаимодействие: ядро зовёт его на каждое событие, и его действие попадает в журнал", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			interactions: [halfHeal],
			entities: [person("А", { x: 100, y: 100 })],
		});
		const a = entities[0];
		if (a === undefined) throw new Error();
		damage(world, a, 10, { lawId: "T-STRIKE" });
		expect(a.resources.health).toBe(95);
		expect(eventsOf(world, "health", a.id)).toHaveLength(2);
	});

	test("Особое взаимодействие: без него мир живёт только по общим правилам", () => {
		const { world, entities } = createTestWorld({
			laws: testLaws,
			entities: [person("А", { x: 100, y: 100 })],
		});
		const a = entities[0];
		if (a === undefined) throw new Error();
		damage(world, a, 10, { lawId: "T-STRIKE" });
		expect(a.resources.health).toBe(90);
	});
});
