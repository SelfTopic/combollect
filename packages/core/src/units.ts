// Единицы измерения и общая геометрия. См. docs/dev/code-style.md: единицы — в имени или типе.

export type Seconds = number;
export type Units = number;
export type EntityId = number;

export interface Vec2 {
	readonly x: Units;
	readonly y: Units;
}

// См. docs/dev/decisions.md, решение 4.
export const TICKS_PER_SECOND = 30;
export const WORLD_DT: Seconds = 1 / TICKS_PER_SECOND;

export function vec(x: number, y: number): Vec2 {
	return { x, y };
}

export const ZERO: Vec2 = { x: 0, y: 0 };

export function add(a: Vec2, b: Vec2): Vec2 {
	return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
	return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, k: number): Vec2 {
	return { x: a.x * k, y: a.y * k };
}

export function length(a: Vec2): number {
	return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): Units {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Vec2): Vec2 {
	const len = length(a);
	return len === 0 ? ZERO : { x: a.x / len, y: a.y / len };
}

export function dot(a: Vec2, b: Vec2): number {
	return a.x * b.x + a.y * b.y;
}

export function rotate(a: Vec2, radians: number): Vec2 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}
