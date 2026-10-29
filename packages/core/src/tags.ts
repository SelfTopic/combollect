// Реестр меток. Источник — docs/dev/glossary.md («Метки») и docs/02-atoms.md, раздел 1.

export const TAGS = [
	// Существование
	"Material",
	"Incorporeal",
	"Concept",
	// Психика (уровень 0)
	"Mind",
	"Emotions",
	"Trauma:Loss",
	"Trauma:Death",
	"Trauma:Loneliness",
	"Trauma:Captivity",
	"Trauma:Guilt",
	"IronWill",
	"Mindless",
	// Тело (уровень 1)
	"Living",
	"Limbs",
	"Brain",
	"Blood",
	"Eyes",
	"Breathing",
	"Regenerating",
	// Физика (уровни 2–4)
	"Mass:Light",
	"Mass:Medium",
	"Mass:Heavy",
	"Mass:Huge",
	"WarmBlooded",
	"Flammable",
	"Nonflammable",
	"Conductor",
	"Insulator",
	// Материя (уровень 5)
	"Atomic",
	"RadResistant",
	// Пространство и время (уровни 6–7)
	"InSpace",
	"Multidimensional",
	"InTime",
	"OutOfTime",
	"TimeAnchor",
	// Служебные
	"Hero",
	"Creep",
	"Structure",
	"Projectile",
	"Summon",
	"Terrain",
	"Neutral",
] as const;

export type TagId = (typeof TAGS)[number];

const TAG_SET: ReadonlySet<string> = new Set(TAGS);

export function isTagId(value: string): value is TagId {
	return TAG_SET.has(value);
}

/**
 * Запрос по меткам: у сущности должны быть все метки из `all`
 * и хотя бы одна из `any` (если `any` задан).
 */
export interface TagQuery {
	readonly all?: readonly TagId[];
	readonly any?: readonly TagId[];
}

export function isEmptyQuery(query: TagQuery): boolean {
	return (query.all?.length ?? 0) === 0 && (query.any?.length ?? 0) === 0;
}

export function matchesQuery(query: TagQuery, tags: ReadonlySet<TagId>): boolean {
	for (const tag of query.all ?? []) {
		if (!tags.has(tag)) return false;
	}
	const any = query.any ?? [];
	return any.length === 0 || any.some((tag) => tags.has(tag));
}

/** Пустой запрос исключений никого не исключает. */
export function excludedBy(query: TagQuery, tags: ReadonlySet<TagId>): boolean {
	return !isEmptyQuery(query) && matchesQuery(query, tags);
}

// Масса по меткам. Отбрасывание обратно пропорционально массе (docs/04-laws-catalog.md, L2-01).
// Значения — ДОПУЩЕНИЕ, см. docs/dev/decisions.md.
const MASS_FACTOR: Readonly<Record<string, number>> = {
	"Mass:Light": 0.5,
	"Mass:Medium": 1,
	"Mass:Heavy": 2,
	"Mass:Huge": 4,
};

export function massFactor(tags: ReadonlySet<TagId>): number {
	let factor = 1;
	for (const tag of tags) {
		const value = MASS_FACTOR[tag];
		if (value !== undefined) factor = value;
	}
	return factor;
}
