import { WORLD_DT } from "@combollect/core";
import { describe, expect, test } from "vitest";
import { FixedStepper } from "../src/game/loop.ts";

describe("Цикл игры", () => {
	test("Цикл: мир тикает 30 раз в секунду независимо от частоты кадров", () => {
		const stepper = new FixedStepper(WORLD_DT);
		let ticks = 0;
		for (let i = 0; i < 144; i++) ticks += stepper.advance(1 / 144);
		expect(ticks).toBe(30);
	});

	test("Цикл: между тиками остаётся доля пути для интерполяции", () => {
		const stepper = new FixedStepper(WORLD_DT);
		expect(stepper.advance(WORLD_DT * 1.5)).toBe(1);
		expect(stepper.alpha).toBeCloseTo(0.5);
	});

	test("Цикл: после долгой паузы вкладки мир не догоняет больше четверти секунды", () => {
		const stepper = new FixedStepper(WORLD_DT);
		expect(stepper.advance(10)).toBe(7);
	});
});
