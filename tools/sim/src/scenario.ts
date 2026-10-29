// Сценарий: начальный мир и расписание приказов по секундам мира.

import { type Entity, step, TICKS_PER_SECOND, type World } from "@combollect/core";

export interface ScenarioSetup {
	readonly world: World;
	/** Действующие лица по коротким именам, чтобы расписанию было на кого ссылаться. */
	readonly actors: Readonly<Record<string, Entity>>;
}

export interface ScriptStep {
	/** Секунда мира (по реальным часам матча), когда выполнить шаг. */
	readonly atSec: number;
	/** Что происходит — для журнала. */
	readonly say: string;
	run(setup: ScenarioSetup): void;
}

export interface Scenario {
	readonly id: string;
	readonly title: string;
	/** Что показывает сценарий — пара фраз для человека. */
	readonly description: string;
	readonly durationSec: number;
	setup(seed: number): ScenarioSetup;
	readonly script: readonly ScriptStep[];
	readonly defaultSeed: number;
}

export interface ScriptNote {
	readonly tick: number;
	readonly text: string;
}

export interface ScenarioRun {
	readonly setup: ScenarioSetup;
	readonly notes: ScriptNote[];
}

export function runScenario(scenario: Scenario, seed = scenario.defaultSeed): ScenarioRun {
	const setup = scenario.setup(seed);
	const { world } = setup;
	const notes: ScriptNote[] = [];
	const pending = [...scenario.script].sort((a, b) => a.atSec - b.atSec);
	const lastTick = Math.round(scenario.durationSec * TICKS_PER_SECOND);
	while (world.tick < lastTick) {
		while (
			pending.length > 0 &&
			Math.round((pending[0]?.atSec ?? 0) * TICKS_PER_SECOND) <= world.tick
		) {
			const next = pending.shift();
			if (next === undefined) break;
			notes.push({ tick: world.tick, text: next.say });
			next.run(setup);
		}
		step(world);
	}
	return { setup, notes };
}
