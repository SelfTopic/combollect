// Особые взаимодействия законов — единственное место, где они могут быть описаны явно
// (docs/dev/architecture.md, «Законы»; docs/05-interactions.md, вид «Особое»).
//
// Все взаимодействия этапа 1 получились системно, через общие состояния. «Остановка времени +
// Удар по остановленному» — общее правило времени и живёт в ядре: packages/core/src/api/deliver.ts.

import type { SpecialInteraction } from "@combollect/core";

export const specialInteractions: readonly SpecialInteraction[] = [];
