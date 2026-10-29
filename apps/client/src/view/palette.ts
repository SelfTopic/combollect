// Визуальный язык (docs/10-controls.md, «Читаемость законов»): цвет эффекта — по уровню абстракции.

import type { Surface, TeamId, Tier } from "@combollect/core";

export const TIER_COLORS: Readonly<Record<Tier, number>> = {
	0: 0x7b3fb0, // психика: фиолетово-чёрный
	1: 0xe02424, // плоть: красный
	2: 0xeeeeee, // механика: белый/серый
	3: 0xff8a1f, // термо: оранжевый (холод — голубой, см. FROST_COLOR)
	4: 0xffee33, // ЭМ и свет: ярко-жёлтый
	5: 0x7cff2a, // ядро: ядовито-зелёный
	6: 0x4b4bd8, // пространство: индиго
	7: 0xe0b03a, // время: золото/сепия
};

export const FROST_COLOR = 0x7fd6ff;
export const TIME_COLOR = TIER_COLORS[7];
export const BLOOD_COLOR = 0x9c1010;

/** Команды — цветом кольца; цвета не совпадают с цветами уровней. */
export const TEAM_COLORS: Readonly<Record<TeamId, number>> = {
	west: 0x3fa9ff,
	east: 0xff4fb0,
};
export const NEUTRAL_RING = 0x222222;

export const SURFACE_COLORS: Readonly<Record<Surface, number>> = {
	ground: 0x6e5c43,
	grass: 0x4a7a36,
	stone: 0x8b8b86,
	water: 0x2b66a8,
	ice: 0xbfe6f7,
	scorched: 0x2c241e,
};

/** Цвет как три канала 0…255. */
function channels(color: number): [number, number, number] {
	return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

function pack(r: number, g: number, b: number): number {
	return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function mix(a: number, b: number, t: number): number {
	const k = Math.min(1, Math.max(0, t));
	const [ar, ag, ab] = channels(a);
	const [br, bg, bb] = channels(b);
	return pack(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/**
 * Время на экране (docs/dev/stage-2.md): чем медленнее часы сущности, тем сильнее она
 * обесцвечена. ×1 — свой цвет, ×0 — серая, как старая фотография.
 */
export function desaturate(color: number, clockRate: number): number {
	const loss = 1 - Math.min(1, Math.max(0, clockRate));
	const [r, g, b] = channels(color);
	const gray = 0.3 * r + 0.59 * g + 0.11 * b;
	// Сепия чуть тёплая — это цвет уровня «Время».
	return mix(color, pack(gray * 1.05, gray * 0.95, gray * 0.8), loss);
}

/** Целостность зоны тела → цвет: зелёный, жёлтый, красный, чёрный (сломано). */
export function integrityColor(pct: number): number {
	if (pct <= 0) return 0x111111;
	if (pct < 50) return mix(0xd32f2f, 0xf0c419, pct / 50);
	return mix(0xf0c419, 0x4caf50, (pct - 50) / 50);
}

export function cssColor(color: number): string {
	return `#${color.toString(16).padStart(6, "0")}`;
}
