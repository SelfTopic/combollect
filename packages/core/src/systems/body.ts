// Тело: сотрясение проходит в своём времени. Остальные последствия зон — в body.ts.

import { localDt } from "../clock.ts";
import { isAlive } from "../entity.ts";
import { entitiesInOrder, type World } from "../world.ts";

export function bodySystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (!isAlive(entity) || entity.state.concussionSec <= 0) continue;
		entity.state.concussionSec = Math.max(0, entity.state.concussionSec - localDt(entity));
	}
}
