// Ввод игрока → команды для плана героя (docs/10-controls.md). Здесь нет правил мира:
// дойдёт ли закон, подействует ли — решает core.

import {
	type Entity,
	type EntityId,
	isAlive,
	type LawDef,
	type PlannedAction,
	type Vec2,
	type World,
} from "@combollect/core";

export type CommandResult =
	| { readonly ok: true; readonly action: PlannedAction }
	| { readonly ok: false; readonly reason: string };

/**
 * ПКМ: по сущности чужой команды — атаковать, пока она жива; иначе — идти в точку.
 * Свои, деревья и камни под курсором не атакуются по ПКМ, чтобы промах не стал ударом
 * по своим (закон при этом своих бьёт — это вопрос ввода, а не правил мира).
 */
export function rightClick(
	world: World,
	hero: Entity,
	point: Vec2,
	entityId: EntityId | null,
): PlannedAction {
	const target = entityId === null ? undefined : world.entities.get(entityId);
	if (
		target !== undefined &&
		target !== hero &&
		isAlive(target) &&
		target.team !== null &&
		target.team !== hero.team
	) {
		return { kind: "attack", targetId: target.id, hold: true };
	}
	return { kind: "move", to: point };
}

/** Закон по клавише: куда он направлен — зависит от его формы. */
export function castLaw(
	law: LawDef,
	slot: number,
	point: Vec2,
	entityId: EntityId | null,
): CommandResult {
	switch (law.form) {
		case "global":
			return { ok: true, action: { kind: "useLaw", slot, target: { kind: "none" } } };
		case "melee":
			if (entityId === null) return { ok: false, reason: "нужна цель: наведите на сущность" };
			return {
				ok: true,
				action: {
					kind: "useLaw",
					slot,
					target: { kind: "entity", id: entityId, aim: point },
					approach: true,
				},
			};
		case "point":
			return {
				ok: true,
				action: { kind: "useLaw", slot, target: { kind: "point", point }, approach: true },
			};
		case "cone":
		case "projectile":
			return { ok: true, action: { kind: "useLaw", slot, target: { kind: "point", point } } };
	}
}

/** Закону нужно прицеливание (иначе применяется сразу по нажатию клавиши). */
export function needsAim(law: LawDef): boolean {
	return law.form !== "global";
}
