// pnpm sim <сценарий> [--all] [--seed N] — прогнать сценарий без графики и напечатать журнал.

import { isAlive } from "@combollect/core";
import { scenarios } from "../scenarios/index.ts";
import { JournalPrinter } from "./format.ts";
import { runScenario } from "./scenario.ts";

function main(args: readonly string[]): number {
	const id = args.find((a) => !a.startsWith("--"));
	const scenario = scenarios.find((s) => s.id === id);
	if (scenario === undefined) {
		console.log("Использование: pnpm sim <сценарий> [--all] [--seed N]\n\nСценарии:");
		for (const s of scenarios) console.log(`  ${s.id.padEnd(18)} ${s.title}`);
		return id === undefined ? 0 : 1;
	}
	const seedArg = args.indexOf("--seed");
	const seed = seedArg >= 0 ? Number(args[seedArg + 1]) : scenario.defaultSeed;
	const { setup, notes } = runScenario(scenario, seed);
	const printer = new JournalPrinter(setup.world);
	console.log(`=== ${scenario.title} (сид ${seed}) ===\n${scenario.description}\n`);
	for (const line of printer.print(notes, { all: args.includes("--all") })) console.log(line);
	console.log("\nИтог:");
	for (const entity of setup.world.entities.values()) {
		if (!isAlive(entity) || entity.tags.has("Projectile")) continue;
		const { health, maxHealth } = entity.resources;
		console.log(
			`  ${entity.name} #${entity.id}: здоровье ${Math.round(health)} из ${Math.round(maxHealth)}`,
		);
	}
	return 0;
}

process.exitCode = main(process.argv.slice(2));
