// Влажность сущностей и клеток. docs/02-atoms.md («Влажность»), docs/09-map.md.
// ДОПУЩЕНИЕ: в воде — промокший, на мокрой земле — хотя бы мокрый; высыхание идёт по своим часам.

import { setCellMoisture } from "../api/cells.ts";
import { setWetness } from "../api/effects.ts";
import { localDt } from "../clock.ts";
import { isAlive, type Wetness } from "../entity.ts";
import type { Cause } from "../events.ts";
import { cellAt } from "../grid.ts";
import { dryingTime } from "../physics.ts";
import { WORLD_DT } from "../units.ts";
import { entitiesInOrder, type World } from "../world.ts";

const WETNESS: Cause = { system: "wetness" };
const DRIER: Readonly<Record<Wetness, Wetness>> = { soaked: "wet", wet: "dry", dry: "dry" };

export function wetnessSystem(world: World): void {
	for (const entity of entitiesInOrder(world)) {
		if (!isAlive(entity) || !entity.tags.has("Material") || entity.tags.has("Projectile")) continue;
		const dt = localDt(entity);
		if (dt === 0) continue;
		const cell = cellAt(world.grid, entity.position);
		const state = entity.state;
		if (cell?.surface === "water") {
			setWetness(world, entity, "soaked", WETNESS);
			state.dryingSec = dryingTime("soaked");
			continue;
		}
		if (cell?.moisture === "wet" && state.wetness === "dry")
			setWetness(world, entity, "wet", WETNESS);
		if (cell?.moisture === "wet" && state.wetness === "wet") {
			state.dryingSec = dryingTime("wet");
			continue;
		}
		if (state.wetness === "dry") continue;
		state.dryingSec -= dt;
		if (state.dryingSec <= 0) {
			setWetness(world, entity, DRIER[state.wetness], WETNESS);
		}
	}
	const grid = world.grid;
	grid.cells.forEach((cell, index) => {
		if (cell.moisture !== "wet") return;
		cell.dryingSec -= WORLD_DT * (grid.rates[index] ?? 1);
		if (cell.dryingSec <= 0) setCellMoisture(world, index, false, WETNESS);
	});
}
