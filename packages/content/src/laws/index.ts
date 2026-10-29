import type { LawDef, LawRegistry } from "@combollect/core";
import { strike } from "./strike.ts";

export { strike };

const ALL: readonly LawDef[] = [strike];

/** Законы этапа 1 (docs/dev/stage-1.md) и базовая атака. */
export const stage1Laws: LawRegistry = new Map(ALL.map((law) => [law.id, law]));
