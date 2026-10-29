// Законы во времени: ресурс, перезарядка и подготовка идут в часах носителя.

import { attackFactor, canGesture, castFactor, isConcussed } from "../body.ts";
import { localDt } from "../clock.ts";
import { isAlive } from "../entity.ts";
import { completeLaw, slotDef } from "../lawRunner.ts";
import { length } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

export function lawSystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (!isAlive(entity)) continue;
		const dt = localDt(entity);
		if (dt === 0) continue;
		const lore = entity.resources.lore;
		if (lore !== null && lore.value < lore.max) {
			// «Стоит на месте» — не шёл в прошлом тике и не летит от толчка.
			const standing = entity.state.walkedUnits === 0 && length(entity.velocity) === 0;
			const regen = standing ? lore.standingRegenPerSec : lore.regenPerSec;
			lore.value = Math.min(lore.max, lore.value + regen * dt);
		}
		for (const slot of entity.laws) {
			if (slot.cooldownSec <= 0) continue;
			const factor = slotDef(world, slot).basicAttack ? attackFactor(entity) : 1;
			slot.cooldownSec = Math.max(0, slot.cooldownSec - dt * factor);
		}
		const windup = entity.state.windup;
		if (windup === null) continue;
		const slot = entity.laws[windup.slot];
		if (slot === undefined) continue;
		const def = slotDef(world, slot);
		// Подготовку сбивает сотрясение и сломанные руки (docs/04-laws-catalog.md, L7-01).
		if (isConcussed(entity) || (def.gesture && !canGesture(entity))) {
			entity.state.windup = null;
			emit(world, {
				kind: "windupInterrupted",
				target: entity.id,
				cause: { lawId: def.id, sourceId: entity.id },
				note: def.name,
			});
			continue;
		}
		windup.remainingSec -= dt * castFactor(entity) * (def.basicAttack ? attackFactor(entity) : 1);
		if (windup.remainingSec > 1e-9) continue;
		entity.state.windup = null;
		completeLaw(world, entity, windup.slot, windup.target);
	}
}
