import type { LawDef, LawRegistry } from "@combollect/core";
import { discharge } from "./discharge.ts";
import { flame } from "./flame.ts";
import { frost } from "./frost.ts";
import { impulse } from "./impulse.ts";
import { strike } from "./strike.ts";
import { throwLaw } from "./throw.ts";
import { timeSlow } from "./timeSlow.ts";

export { discharge, flame, frost, impulse, strike, throwLaw, timeSlow };

const ALL: readonly LawDef[] = [strike, impulse, throwLaw, flame, frost, discharge, timeSlow];

/** Законы этапа 1 (docs/dev/stage-1.md) и базовая атака. */
export const stage1Laws: LawRegistry = new Map(ALL.map((law) => [law.id, law]));
