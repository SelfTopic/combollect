// Следы законов на карте угасают по часам клеток (docs/09-map.md, «Следы законов»).

import { meltIce, setSurface } from "../api/cells.ts";
import type { Cause } from "../events.ts";
import { WORLD_DT } from "../units.ts";
import type { World } from "../world.ts";

const TRACE: Cause = { system: "trace" };

export function traceSystem(world: World): void {
	const grid = world.grid;
	grid.cells.forEach((cell, index) => {
		const blood = cell.blood;
		if (blood !== null) {
			blood.remainingSec -= WORLD_DT * (grid.rates[index] ?? 1);
			if (blood.remainingSec <= 1e-9) cell.blood = null;
		}
		const trace = cell.trace;
		if (trace === null) return;
		trace.remainingSec -= WORLD_DT * (grid.rates[index] ?? 1);
		if (trace.remainingSec > 1e-9) return;
		if (trace.kind === "ice") {
			// Лёд, который растаял сам, — та же вода, что и растопленная огнём.
			meltIce(world, index, TRACE);
			return;
		}
		cell.trace = null;
		setSurface(world, index, cell.baseSurface, TRACE);
	});
}
