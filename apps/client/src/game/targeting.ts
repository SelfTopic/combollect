// Подсказка «не подействует» (docs/10-controls.md): по меткам видно заранее,
// подействует ли закон на сущность под курсором.

import { affects, type Entity, effectiveTags, type LawDef, type TagId } from "@combollect/core";
import { TAG_NAMES } from "@combollect/journal";

const quote = (tag: TagId): string => `«${TAG_NAMES[tag]}»`;

/** Почему закон не подействует на сущность; null — подействует. */
export function noEffectReason(law: LawDef, entity: Entity): string | null {
	// Решает core; здесь только объяснение словами.
	if (affects(law, entity)) return null;
	const tags = effectiveTags(entity);
	const missing = (law.requires.all ?? []).filter((t) => !tags.has(t));
	if (missing.length > 0)
		return `нет ${missing.length > 1 ? "меток" : "метки"} ${missing.map(quote).join(", ")}`;
	const any = law.requires.any ?? [];
	if (any.length > 0 && !any.some((t) => tags.has(t))) {
		return `нужна одна из меток: ${any.map(quote).join(", ")}`;
	}
	const all = law.excludes.all ?? [];
	const excludedAll = all.length > 0 && all.every((t) => tags.has(t));
	const excludedAny = (law.excludes.any ?? []).filter((t) => tags.has(t));
	if (excludedAll) return `иммунен: ${all.map(quote).join(", ")}`;
	if (excludedAny.length > 0) return `иммунен: ${excludedAny.map(quote).join(", ")}`;
	return "не подходит по меткам";
}

/** Законы, которые бьют только того, на кого наведены, — им важна сущность под курсором. */
export function targetsEntity(law: LawDef): boolean {
	return law.form === "melee" || law.form === "projectile";
}
