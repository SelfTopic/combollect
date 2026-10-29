// Особые взаимодействия законов — единственное место, где они могут быть описаны явно
// (docs/dev/architecture.md, «Законы»; docs/05-interactions.md, вид «Особое»).
//
// Остальные взаимодействия получаются системно, через общие состояния. «Остановка времени +
// Удар по остановленному» — общее правило времени и живёт в ядре: packages/core/src/api/deliver.ts.

import { closeWounds, type GameEvent, type SpecialInteraction, type World } from "@combollect/core";
import { flame } from "./laws/flame.ts";

/**
 * Огонь дошёл до раны: тепло Пламени, которое действительно подняло температуру тела
 * (а не ушло на высыхание), или тело само загорелось. ДОПУЩЕНИЕ, см. docs/dev/decisions.md.
 */
function fireReachedFlesh(event: GameEvent): boolean {
	if (event.kind === "ignited") return true;
	return (
		event.kind === "temperature" &&
		event.cause.lawId === flame.id &&
		Number(event.after) > Number(event.before)
	);
}

/**
 * docs/05-interactions.md, «Пламя + Кровотечение»: прижигание снимает стаки, но обжигает.
 * Ожог здесь не пишется отдельно: это то же тепло Пламени, оно жжёт по общим правилам
 * температуры (docs/02-atoms.md, +10…+30: ожоги).
 */
export const cauterization: SpecialInteraction = {
	row: "Пламя + Кровотечение",
	description: "Прижигание: огонь закрывает все раны, но обжигает",
	react(world: World, event: GameEvent): void {
		if (event.target === undefined || !fireReachedFlesh(event)) return;
		const entity = world.entities.get(event.target);
		if (entity === undefined || entity.state.wounds.length === 0) return;
		closeWounds(world, entity, event.cause, Number.POSITIVE_INFINITY, "прижигание");
	},
};

export const specialInteractions: readonly SpecialInteraction[] = [cauterization];
