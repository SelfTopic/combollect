// Фиксированный шаг симуляции через аккумулятор (docs/dev/stage-2.md, «Цикл игры»):
// мир тикает 30 раз в секунду, а кадры рисуются с интерполяцией между тиками.

export class FixedStepper {
	private accumulator = 0;

	/**
	 * @param stepSec длина тика мира
	 * @param maxFrameSec кадр длиннее этого (вкладка была свёрнута) не догоняется целиком
	 */
	constructor(
		private readonly stepSec: number,
		private readonly maxFrameSec = 0.25,
	) {}

	/** Сколько тиков сделать за прошедший кадр. */
	advance(frameSec: number): number {
		this.accumulator += Math.min(Math.max(frameSec, 0), this.maxFrameSec);
		let ticks = 0;
		while (this.accumulator >= this.stepSec - 1e-9) {
			this.accumulator -= this.stepSec;
			ticks += 1;
		}
		return ticks;
	}

	/** Доля пути от прошлого тика к следующему: 0…1, для интерполяции. */
	get alpha(): number {
		return Math.min(1, Math.max(0, this.accumulator / this.stepSec));
	}
}
