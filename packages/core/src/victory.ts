// Условия победы. docs/15-match-goals.md: цель матча — функция, которая смотрит на мир
// и отвечает «победила такая-то команда» или «бой продолжается».

import type { TeamId } from "./entity.ts";
import { emit, type World } from "./world.ts";

export interface VictoryResult {
	/** null — ничья (например, оба трона пали в один тик). */
	readonly winner: TeamId | null;
	/** Что случилось — по-русски, для журнала и экрана победы. */
	readonly reason: string;
}

/** Условие победы: результат — матч окончен, null — бой продолжается. */
export type VictoryCondition = (world: World) => VictoryResult | null;

/**
 * Проверить условия по порядку; сработавшее первым заканчивает матч.
 * Зовётся каждый тик после всех систем (docs/dev/stage-2.md).
 */
export function checkVictory(world: World): void {
	if (world.result !== null) return;
	for (const condition of world.victoryConditions) {
		const result = condition(world);
		if (result === null) continue;
		world.result = result;
		emit(world, {
			kind: "matchEnded",
			cause: { system: "victory" },
			after: result.winner,
			note: result.reason,
		});
		return;
	}
}

export function isMatchOver(world: World): boolean {
	return world.result !== null;
}
