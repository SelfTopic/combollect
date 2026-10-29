// Смерть и уход сущностей из мира.

import type { Cause } from "../events.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

const DEATH: Cause = { system: "death" };

export function deathSystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (entity.state.removed) {
			world.entities.delete(entity.id);
			emit(world, { kind: "entityRemoved", target: entity.id, cause: DEATH, note: entity.name });
		} else if (entity.resources.health <= 0) {
			world.entities.delete(entity.id);
			emit(world, {
				kind: "death",
				target: entity.id,
				cause: DEATH,
				note: entity.name,
				at: entity.position,
			});
		}
	}
}
