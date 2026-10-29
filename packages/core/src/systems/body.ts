// Тело: сотрясение, кровопотеря и регенерация — всё в своём времени.
// Остальные последствия зон — в body.ts. Числа кровопотери приходят из раны (параметры закона).

import { applyDamage, applyHealing, closeWounds, healZones } from "../api/effects.ts";
import { localDt } from "../clock.ts";
import { type Entity, isAlive } from "../entity.ts";
import type { Cause } from "../events.ts";
import { cellIndexAt } from "../grid.ts";
import { REGEN_WOUND_CLOSE_SEC, REGEN_ZONE_PCT_PER_SEC } from "../physics.ts";
import { emit, entitiesInOrder, type World } from "../world.ts";

const REGENERATION: Cause = { system: "regeneration" };

/**
 * Кровопотеря (docs/02-atoms.md): открытая рана теряет здоровье при движении — сердце качает
 * кровь, — стоя меньше. За собой раненый оставляет кровавый след (docs/09-map.md).
 */
function bleed(world: World, entity: Entity, dt: number): void {
	const wounds = entity.state.wounds;
	const last = wounds[wounds.length - 1];
	if (last === undefined) return;
	const walked = entity.state.walkedUnits;
	let loss = 0;
	for (const w of wounds) {
		loss += walked > 0 ? (w.healthPer100Units * walked) / 100 : w.healthPerSecStanding * dt;
	}
	// Причина — последняя рана: журнал объясняет, кто и чем пустил кровь.
	applyDamage(world, entity, loss, { ...last.cause, system: "bleeding" }, true);
	markBlood(world, entity, Math.max(...wounds.map((w) => w.trailSec)));
}

function markBlood(world: World, entity: Entity, trailSec: number): void {
	const index = cellIndexAt(world.grid, entity.position);
	const cell = index === null ? undefined : world.grid.cells[index];
	if (index === null || cell === undefined) return;
	const fresh = cell.blood === null;
	cell.blood = { remainingSec: trailSec, heading: entity.state.heading };
	if (fresh) {
		emit(world, {
			kind: "cellBlood",
			cell: index,
			cause: { sourceId: entity.id, system: "bleeding" },
			minor: true,
		});
	}
}

/** `Regenerating` восстанавливает части тела естественным путём. ДОПУЩЕНИЕ, см. decisions.md. */
function regenerate(world: World, entity: Entity, dt: number): void {
	const pct = REGEN_ZONE_PCT_PER_SEC * dt;
	healZones(world, entity, pct, REGENERATION);
	applyHealing(world, entity, (pct / 100) * entity.resources.maxHealth, REGENERATION, true);
	if (entity.state.wounds.length === 0) return;
	entity.state.woundHealSec -= dt;
	if (entity.state.woundHealSec > 1e-9) return;
	closeWounds(world, entity, REGENERATION, 1, "рана затянулась");
	entity.state.woundHealSec = REGEN_WOUND_CLOSE_SEC;
}

export function bodySystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (!isAlive(entity)) continue;
		const dt = localDt(entity);
		if (dt === 0) continue;
		if (entity.state.concussionSec > 0) {
			entity.state.concussionSec = Math.max(0, entity.state.concussionSec - dt);
		}
		bleed(world, entity, dt);
		if (entity.tags.has("Regenerating")) regenerate(world, entity, dt);
	}
}
