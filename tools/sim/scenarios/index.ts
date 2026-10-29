import type { Scenario } from "../src/scenario.ts";
import { arenaKnifeWall } from "./arena-knife-wall.ts";
import { knifeWall } from "./knife-wall.ts";
import { puddleLightning } from "./puddle-lightning.ts";

export const scenarios: readonly Scenario[] = [puddleLightning, knifeWall, arenaKnifeWall];
