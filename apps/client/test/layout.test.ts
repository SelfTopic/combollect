import { createArenaGrid } from "@combollect/content";
import { describe, expect, test } from "vitest";
import {
	fitArena,
	HUD_PX,
	SIDE_PANEL_PX,
	screenToWorld,
	worldToScreen,
} from "../src/view/layout.ts";

describe("Камера", () => {
	test("Камера: арена целиком на экране, без прокрутки", () => {
		const grid = createArenaGrid();
		const layout = fitArena(grid, 1600, 900);
		expect(grid.width * 32 * layout.scale).toBeLessThanOrEqual(1600 - SIDE_PANEL_PX + 1e-6);
		expect(grid.height * 32 * layout.scale).toBeLessThanOrEqual(900 - HUD_PX + 1e-6);
	});

	test("Камера: экран ↔ мир — взаимно обратные", () => {
		const layout = fitArena(createArenaGrid(), 1366, 768);
		const p = { x: 321, y: 123 };
		const back = screenToWorld(layout, worldToScreen(layout, p).x, worldToScreen(layout, p).y);
		expect(back.x).toBeCloseTo(p.x);
		expect(back.y).toBeCloseTo(p.y);
	});
});
