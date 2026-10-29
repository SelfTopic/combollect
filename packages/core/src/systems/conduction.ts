// Ток, оставшийся в воде после разряда (docs/04-laws-catalog.md, L4-01): каждый проводник,
// который стоит в заряженной воде, получает удар один раз за заряд. Заряд гаснет по часам воды.

import { damage, damageZone } from "../api/deliver.ts";
import { isAlive } from "../entity.ts";
import { hasTag } from "../entityTags.ts";
import { cellIndexAt } from "../grid.ts";
import { WORLD_DT } from "../units.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

export function conductionSystem(world: World): void {
	if (world.charges.length === 0) return;
	const entities = entitiesInOrder(world);
	for (const charge of world.charges) {
		const first = charge.cells[0];
		const dt = WORLD_DT * (first === undefined ? 1 : (world.grid.rates[first] ?? 1));
		if (dt === 0) continue;
		for (const entity of entities) {
			if (
				!isAlive(entity) ||
				charge.shockedIds.includes(entity.id) ||
				!hasTag(entity, "Conductor")
			) {
				continue;
			}
			const at = cellIndexAt(world.grid, entity.position);
			if (at === null || !charge.cells.includes(at)) continue;
			charge.shockedIds.push(entity.id);
			emit(world, { kind: "current", target: entity.id, cause: charge.cause, note: "ток в воде" });
			damage(world, entity, charge.damage, charge.cause);
			damageZone(world, entity, "head", charge.headDamagePct, charge.cause);
		}
		charge.remainingSec -= dt;
	}
	world.charges = world.charges.filter((c) => c.remainingSec > 1e-9);
}
