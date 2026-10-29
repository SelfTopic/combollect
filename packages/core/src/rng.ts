// Единственный источник случайности в мире. Состояние — одно число, поэтому мир сериализуем.
// Алгоритм mulberry32: быстрый, детерминированный, одинаковый во всех средах.

export interface Rng {
	state: number;
}

export function createRng(seed: number): Rng {
	return { state: seed >>> 0 };
}

/** Число в [0, 1). */
export function nextFloat(rng: Rng): number {
	rng.state = (rng.state + 0x6d2b79f5) >>> 0;
	let t = rng.state;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Целое в [min, max]. */
export function nextInt(rng: Rng, min: number, max: number): number {
	return min + Math.floor(nextFloat(rng) * (max - min + 1));
}
