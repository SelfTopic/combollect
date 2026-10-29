// Камера без прокрутки: арена целиком на экране (docs/dev/stage-2.md, «Карта-арена»).

import { CELL_SIZE, type Grid, type Vec2 } from "@combollect/core";

export const SIDE_PANEL_PX = 360;
export const HUD_PX = 178;

export interface Layout {
	readonly scale: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

export function fitArena(grid: Grid, screenW: number, screenH: number): Layout {
	const worldW = grid.width * CELL_SIZE;
	const worldH = grid.height * CELL_SIZE;
	const areaW = Math.max(200, screenW - SIDE_PANEL_PX);
	const areaH = Math.max(200, screenH - HUD_PX);
	const scale = Math.min(areaW / worldW, areaH / worldH);
	return {
		scale,
		offsetX: (areaW - worldW * scale) / 2,
		offsetY: (areaH - worldH * scale) / 2,
	};
}

export function screenToWorld(layout: Layout, x: number, y: number): Vec2 {
	return { x: (x - layout.offsetX) / layout.scale, y: (y - layout.offsetY) / layout.scale };
}

export function worldToScreen(layout: Layout, p: Vec2): Vec2 {
	return { x: p.x * layout.scale + layout.offsetX, y: p.y * layout.scale + layout.offsetY };
}
