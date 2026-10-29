import { butcher } from "./butcher.ts";
import { chronist } from "./chronist.ts";
import type { HeroDef } from "./hero.ts";
import { shadow } from "./shadow.ts";

export * from "./hero.ts";
export { butcher, chronist, shadow };

/** Герои этапа 2 (docs/dev/stage-2.md) в порядке выбора. */
export const stage2Heroes: readonly HeroDef[] = [chronist, shadow, butcher];

export function heroById(id: string): HeroDef {
	const hero = stage2Heroes.find((h) => h.id === id);
	if (hero === undefined) throw new Error(`Неизвестный герой ${id}`);
	return hero;
}
