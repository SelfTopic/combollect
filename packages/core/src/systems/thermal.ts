// Температура, горение, распространение огня, таяние и замерзание.
// docs/02-atoms.md («Температура»), docs/04-laws-catalog.md (L3-01, L3-02), docs/06-time-system.md (правило 3).
//
// Тепло, которое сущность получает от мира, идёт по её часам: огонь в остановленном времени
// не греет тех, кто во времени, но обжигает того, кто вне времени и вошёл в огонь.

import { applyDamage, applyTemperature, applyZoneDamage } from "../api/effects.ts";
import { localDt } from "../clock.ts";
import { type Entity, isAlive } from "../entity.ts";
import type { Cause } from "../events.ts";
import { cellIndexAt } from "../grid.ts";
import {
	BURN_INJURY_DAMAGE_PER_DEGREE_SEC,
	BURN_INJURY_TEMP,
	BURNING_DAMAGE_PER_SEC,
	BURNING_NEIGHBOR_HEAT_PER_SEC,
	BURNING_SELF_HEAT_PER_SEC,
	CELL_FIRE_HEAT_PER_SEC,
	CONTACT_GAP_UNITS,
	LIMB_FREEZE_LOSS_PCT_PER_SEC,
	LIMB_FREEZE_TEMP,
	PASSIVE_RELAX_PER_SEC,
	SCORCHED_HEAT_PER_SEC,
	WARM_BLOODED_RELAX_PER_SEC,
} from "../physics.ts";
import { distance } from "../units.ts";
import { entitiesInOrder, type World } from "../world.ts";
import { cellProcesses, heatGround, towards } from "./thermalCells.ts";

const THERMAL: Cause = { system: "thermal" };
const MINOR = { minor: true } as const;
const RELAX = { relax: true } as const;

function inContact(a: Entity, b: Entity): boolean {
	return (
		distance(a.position, b.position) <=
		a.stats.radiusUnits + b.stats.radiusUnits + CONTACT_GAP_UNITS
	);
}

/** Жар от земли под ногами и от горящих соседей — по часам получателя. */
function receiveHeat(world: World, entity: Entity, dt: number, burning: readonly Entity[]): void {
	const index = cellIndexAt(world.grid, entity.position);
	const cell = index === null ? undefined : world.grid.cells[index];
	if (cell?.surface === "scorched") {
		applyTemperature(world, entity, SCORCHED_HEAT_PER_SEC * dt, THERMAL, MINOR);
	}
	if (cell !== undefined && cell.burningSec > 0) {
		applyTemperature(world, entity, CELL_FIRE_HEAT_PER_SEC * dt, THERMAL, MINOR);
	}
	for (const source of burning) {
		if (source !== entity && inContact(source, entity)) {
			applyTemperature(
				world,
				entity,
				BURNING_NEIGHBOR_HEAT_PER_SEC * dt,
				{ ...THERMAL, sourceId: source.id },
				MINOR,
			);
		}
	}
}

/** Своё: остывание к норме, горение, ожоги, замерзание конечностей — по своим часам. */
function selfProcesses(world: World, entity: Entity, dt: number): void {
	// Сначала жар собственного огня, потом остывание: иначе только что вспыхнувшее
	// на пороге тут же гасло бы и вспыхивало снова.
	if (entity.state.burning) {
		applyTemperature(world, entity, BURNING_SELF_HEAT_PER_SEC * dt, THERMAL, MINOR);
		applyDamage(world, entity, BURNING_DAMAGE_PER_SEC * dt, THERMAL, true);
	}
	const t = entity.state.temperature;
	const relax = entity.tags.has("WarmBlooded") ? WARM_BLOODED_RELAX_PER_SEC : PASSIVE_RELAX_PER_SEC;
	const relaxed = towards(t, 0, relax * dt);
	if (relaxed !== t) applyTemperature(world, entity, relaxed - t, THERMAL, RELAX);
	// Ожоги и обморожение — у тех, кто держит свою температуру (docs/02-atoms.md, `Теплокровный`).
	if (!entity.tags.has("WarmBlooded")) return;
	const now = entity.state.temperature;
	if (now > BURN_INJURY_TEMP) {
		applyDamage(
			world,
			entity,
			(now - BURN_INJURY_TEMP) * BURN_INJURY_DAMAGE_PER_DEGREE_SEC * dt,
			THERMAL,
			true,
		);
	}
	if (now < LIMB_FREEZE_TEMP) {
		applyZoneDamage(world, entity, "arms", LIMB_FREEZE_LOSS_PCT_PER_SEC * dt, THERMAL, true);
		applyZoneDamage(world, entity, "legs", LIMB_FREEZE_LOSS_PCT_PER_SEC * dt, THERMAL, true);
	}
}

export function thermalSystem(world: World): void {
	const entities = entitiesInOrder(world).filter((e) => isAlive(e) && e.tags.has("Material"));
	const burning = entities.filter((e) => e.state.burning);
	for (const entity of entities) {
		const dt = localDt(entity);
		if (dt === 0) continue;
		receiveHeat(world, entity, dt, burning);
		selfProcesses(world, entity, dt);
	}
	heatGround(world, burning);
	cellProcesses(world);
}
