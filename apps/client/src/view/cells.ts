// Клетки карты: поверхность, влажность, жар и холод, огонь на траве, кровавый след.

import { CELL_SIZE, cellCenter, type World } from "@combollect/core";
import { Graphics } from "pixi.js";
import { BLOOD_COLOR, desaturate, mix, SURFACE_COLORS } from "./palette.ts";

const WET_TINT = 0x1d3a55;
const HOT_TINT = 0xff6a00;
const COLD_TINT = 0xa8e4ff;

export class CellLayer {
	readonly view = new Graphics();
	private drawnTick = -1;
	private drawnFlicker = -1;

	draw(world: World, realSec: number): void {
		// Рисуем раз в тик мира и чуть чаще для мерцания огня.
		const flicker = Math.floor(realSec * 8);
		if (world.tick === this.drawnTick && flicker === this.drawnFlicker) return;
		this.drawnTick = world.tick;
		this.drawnFlicker = flicker;
		const g = this.view;
		g.clear();
		const { grid } = world;
		grid.cells.forEach((cell, i) => {
			const x = (i % grid.width) * CELL_SIZE;
			const y = Math.floor(i / grid.width) * CELL_SIZE;
			let color = SURFACE_COLORS[cell.surface];
			if (cell.moisture === "wet") color = mix(color, WET_TINT, 0.35);
			if (cell.temperature > 5)
				color = mix(color, HOT_TINT, Math.min(0.55, (cell.temperature - 5) / 50));
			if (cell.temperature < -5 && cell.surface !== "ice")
				color = mix(color, COLD_TINT, Math.min(0.5, (-5 - cell.temperature) / 30));
			const rate = grid.rates[i] ?? 1;
			g.rect(x, y, CELL_SIZE, CELL_SIZE).fill(desaturate(color, rate));
			if (cell.surface === "water") {
				g.moveTo(x + 6, y + 12)
					.lineTo(x + 14, y + 10)
					.moveTo(x + 18, y + 24)
					.lineTo(x + 26, y + 22)
					.stroke({ width: 1, color: desaturate(0x5b94d1, rate), alpha: 0.7 });
			}
			if (cell.surface === "ice") {
				g.moveTo(x + 4, y + 26)
					.lineTo(x + 20, y + 8)
					.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
			}
			if (cell.surface === "grass") {
				g.moveTo(x + 8, y + 20)
					.lineTo(x + 9, y + 15)
					.moveTo(x + 22, y + 12)
					.lineTo(x + 23, y + 7)
					.stroke({ width: 1, color: desaturate(0x6aa04f, rate), alpha: 0.8 });
			}
			if (cell.burningSec > 0) this.drawFire(g, x, y, (flicker + i) % 2 === 0);
		});
		// Кровь поверх всего: видно, куда ушёл раненый (docs/09-map.md).
		grid.cells.forEach((cell, i) => {
			const blood = cell.blood;
			if (blood === null) return;
			const c = cellCenter(grid, i);
			const alpha = 0.35 + 0.55 * Math.min(1, blood.remainingSec / 30);
			const h = blood.heading;
			const tint = desaturate(BLOOD_COLOR, grid.rates[i] ?? 1);
			g.ellipse(c.x - h.x * 4, c.y - h.y * 4, 7, 5).fill({ color: tint, alpha });
			g.circle(c.x + h.x * 9, c.y + h.y * 9, 2.5).fill({ color: tint, alpha });
			g.circle(c.x - h.y * 6, c.y + h.x * 6, 1.8).fill({ color: tint, alpha: alpha * 0.8 });
		});
	}

	private drawFire(g: Graphics, x: number, y: number, phase: boolean): void {
		const lift = phase ? 3 : 0;
		g.poly([x + 6, y + 28, x + 12, y + 8 - lift, x + 18, y + 28]).fill({
			color: 0xff7a00,
			alpha: 0.9,
		});
		g.poly([x + 15, y + 28, x + 22, y + 12 + lift, x + 28, y + 28]).fill({
			color: 0xffc400,
			alpha: 0.9,
		});
	}
}
