// Особые взаимодействия законов — единственное место, где они могут быть описаны явно
// (docs/dev/architecture.md, «Законы»; docs/05-interactions.md, вид «Особое»).
//
// На этапе 1 здесь пусто, и это результат, а не пробел: все взаимодействия законов этапа 1
// из таблицы docs/05-interactions.md получаются системно, через общие состояния.
// Единственное «особое» взаимодействие этапа 1 — «Остановка времени + Удар по остановленному» —
// по заданию (docs/dev/stage-1.md, п. 3) живёт в ядре: packages/core/src/api/deliver.ts.
// См. docs/dev/decisions.md.

export interface SpecialInteraction {
	/** Строка таблицы docs/05-interactions.md: «A + B». */
	readonly row: string;
	readonly description: string;
}

export const specialInteractions: readonly SpecialInteraction[] = [];
