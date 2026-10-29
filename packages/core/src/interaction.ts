// Особые взаимодействия законов (docs/05-interactions.md, вид «Особое»). Ядро не знает ни одного:
// оно только даёт им место. Сами взаимодействия описаны в content/interactions.ts.

import type { GameEvent } from "./events.ts";
import type { World } from "./world.ts";

export interface SpecialInteraction {
	/** Строка таблицы docs/05-interactions.md: «A + B». */
	readonly row: string;
	readonly description: string;
	/**
	 * Реакция на событие мира. Зовётся сразу после каждого события журнала и меняет мир
	 * только через API ядра — тогда и её последствия попадают в журнал с причиной.
	 */
	react(world: World, event: GameEvent): void;
}
