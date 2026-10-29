// Русские названия меток и зон — для подсказок игроку. Источник — docs/dev/glossary.md.

import type { BodyZone, TagId, TeamId, Wetness } from "@combollect/core";

export const TAG_NAMES: Readonly<Record<TagId, string>> = {
	Material: "Материальный",
	Incorporeal: "Бесплотный",
	Concept: "Концепт",
	Mind: "Разум",
	Emotions: "Эмоции",
	"Trauma:Loss": "Травма: утрата",
	"Trauma:Death": "Травма: смерть",
	"Trauma:Loneliness": "Травма: одиночество",
	"Trauma:Captivity": "Травма: плен",
	"Trauma:Guilt": "Травма: вина",
	IronWill: "Несгибаемая воля",
	Mindless: "Безразумный",
	Living: "Живой",
	Limbs: "Конечности",
	Brain: "Мозг",
	Blood: "Кровь",
	Eyes: "Глаза",
	Breathing: "Дыхание",
	Regenerating: "Регенерирующий",
	"Mass:Light": "Масса: лёгкая",
	"Mass:Medium": "Масса: средняя",
	"Mass:Heavy": "Масса: тяжёлая",
	"Mass:Huge": "Масса: огромная",
	WarmBlooded: "Теплокровный",
	Flammable: "Горючий",
	Nonflammable: "Негорючий",
	Conductor: "Проводник",
	Insulator: "Изолятор",
	Atomic: "Атомная структура",
	RadResistant: "Радиостойкий",
	InSpace: "В пространстве",
	Multidimensional: "Многомерный",
	InTime: "Во времени",
	OutOfTime: "Вне времени",
	TimeAnchor: "Якорь времени",
	Hero: "Герой",
	Creep: "Крип",
	Structure: "Строение",
	Projectile: "Снаряд",
	Summon: "Призыв",
	Terrain: "Местность",
	Neutral: "Нейтрал",
};

export const ZONE_NAMES: Readonly<Record<BodyZone, string>> = {
	head: "голова",
	torso: "торс",
	arms: "руки",
	legs: "ноги",
};

export const WETNESS_NAMES: Readonly<Record<Wetness, string>> = {
	dry: "сухой",
	wet: "мокрый",
	soaked: "промокший",
};

const TEAM_NAMES: Readonly<Record<string, string>> = { west: "Запад", east: "Восток" };

export function teamName(team: TeamId | null): string {
	return team === null ? "ничей" : (TEAM_NAMES[team] ?? team);
}
