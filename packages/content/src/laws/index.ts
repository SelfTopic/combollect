import type { LawDef, LawRegistry } from "@combollect/core";
import { bleeding } from "./bleeding.ts";
import { discharge } from "./discharge.ts";
import { flame } from "./flame.ts";
import { fracture, fractureZone } from "./fracture.ts";
import { frost } from "./frost.ts";
import { impulse } from "./impulse.ts";
import { strike } from "./strike.ts";
import { throwLaw } from "./throw.ts";
import { timeSlow } from "./timeSlow.ts";
import { timeStop } from "./timeStop.ts";

export {
	bleeding,
	discharge,
	flame,
	fracture,
	fractureZone,
	frost,
	impulse,
	strike,
	throwLaw,
	timeSlow,
	timeStop,
};

const STAGE_1: readonly LawDef[] = [strike, impulse, throwLaw, flame, frost, discharge, timeSlow];
const STAGE_2: readonly LawDef[] = [timeStop, fracture, bleeding];

/** Законы этапа 1 (docs/dev/stage-1.md) и базовая атака. */
export const stage1Laws: LawRegistry = new Map(STAGE_1.map((law) => [law.id, law]));

/** Все законы, которые есть в игре сейчас: этап 1 и этап 2 (docs/dev/stage-2.md). */
export const allLaws: LawRegistry = new Map([...STAGE_1, ...STAGE_2].map((law) => [law.id, law]));
