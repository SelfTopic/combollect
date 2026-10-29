import { describe, expect, test } from "vitest";
import { desaturate, integrityColor, TIER_COLORS } from "../src/view/palette.ts";

describe("Визуальный язык", () => {
	test("Время на экране: при ×1 цвет свой, при ×0 — без насыщенности", () => {
		expect(desaturate(0xe02424, 1)).toBe(0xe02424);
		const gray = desaturate(0xe02424, 0);
		const [r, g, b] = [(gray >> 16) & 0xff, (gray >> 8) & 0xff, gray & 0xff];
		expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(30);
	});

	test("Время на экране: замедленное обесцвечено частично — тем сильнее, чем медленнее", () => {
		const spread = (c: number) => {
			const ch = [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
			return Math.max(...ch) - Math.min(...ch);
		};
		const red = 0xe02424;
		expect(spread(desaturate(red, 0.25))).toBeLessThan(spread(desaturate(red, 0.9)));
		expect(spread(desaturate(red, 0.25))).toBeGreaterThan(spread(desaturate(red, 0)));
	});

	test("Цвета уровней: у каждого из 8 уровней свой цвет", () => {
		const colors = Object.values(TIER_COLORS);
		expect(colors).toHaveLength(8);
		expect(new Set(colors).size).toBe(8);
	});

	test("Бумажная кукла: сломанная зона — чёрная, целая — зелёная", () => {
		expect(integrityColor(0)).toBe(0x111111);
		expect(integrityColor(100)).toBe(0x4caf50);
	});
});
