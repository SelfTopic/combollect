// Один тик мира: системы в фиксированном порядке (docs/dev/architecture.md, «Системы»).

import { clockSystem } from "./clock.ts";
import { bodySystem } from "./systems/body.ts";
import { conductionSystem } from "./systems/conduction.ts";
import { deathSystem } from "./systems/death.ts";
import { lawSystem } from "./systems/law.ts";
import { movementSystem } from "./systems/movement.ts";
import { planSystem } from "./systems/plan.ts";
import { projectileSystem } from "./systems/projectile.ts";
import { thermalSystem } from "./systems/thermal.ts";
import { traceSystem } from "./systems/trace.ts";
import { wetnessSystem } from "./systems/wetness.ts";
import type { World } from "./world.ts";

export const SYSTEMS: readonly ((world: World) => void)[] = [
	clockSystem,
	planSystem,
	lawSystem,
	movementSystem,
	projectileSystem,
	thermalSystem,
	wetnessSystem,
	conductionSystem,
	bodySystem,
	traceSystem,
	deathSystem,
];

export function step(world: World): void {
	for (const system of SYSTEMS) system(world);
	world.tick += 1;
}
