# Словарь: дизайн → код

Дизайн пишется по-русски, код — по-английски. Эта таблица — единственный источник соответствия. Новый термин сначала добавляется сюда.

## Основные понятия

| Дизайн | Код |
|--------|-----|
| Сущность | `Entity` |
| Метка | `Tag`, `TagId` |
| Состояние | `EntityState` / поле состояния |
| Ресурс | `Resources` |
| Закон | `Law`, `LawDef` |
| Уровень абстракции | `Tier` (0–7) |
| Носитель | `bearer` |
| Цель | `target` |
| Цена (лорная) | `cost.lore` |
| Подготовка | `windup` |
| Перезарядка | `cooldown` |
| След | `Trace` |
| Часы сущности | `Clock`, `clock.rate` |
| Поле времени (активное замедление/остановка) | `TimeField` |
| Мутация | `Mutation` |
| План (запланированные действия) | `plan`, `PlannedAction` |
| Журнал событий | `EventLog` |
| Клетка карты | `Cell`, карта — `Grid` |
| Зона тела | `BodyZone`: `head`, `torso`, `arms`, `legs` |

## Уровни

| Ур. | Дизайн | Код (`Tier`) |
|-----|--------|--------------|
| 0 | Психика | `Psyche` |
| 1 | Плоть | `Flesh` |
| 2 | Механика | `Mechanics` |
| 3 | Термодинамика и химия | `Thermal` |
| 4 | Электромагнетизм и свет | `Electromagnetic` |
| 5 | Материя и ядро | `Nuclear` |
| 6 | Пространство | `Space` |
| 7 | Время | `Time` |

## Метки

| Дизайн | Код |
|--------|-----|
| Материальный | `Material` |
| Бесплотный | `Incorporeal` |
| Концепт | `Concept` |
| Разум | `Mind` |
| Эмоции | `Emotions` |
| Травма:<тип> | `Trauma:Loss`, `Trauma:Death`, `Trauma:Loneliness`, `Trauma:Captivity`, `Trauma:Guilt` |
| Несгибаемая воля | `IronWill` |
| Безразумный | `Mindless` |
| Живой | `Living` |
| Конечности | `Limbs` |
| Мозг | `Brain` |
| Кровь | `Blood` |
| Глаза | `Eyes` |
| Дыхание | `Breathing` |
| Регенерирующий | `Regenerating` |
| Масса:<…> | `Mass:Light`, `Mass:Medium`, `Mass:Heavy`, `Mass:Huge` |
| Теплокровный | `WarmBlooded` |
| Горючий | `Flammable` |
| Негорючий | `Nonflammable` |
| Проводник | `Conductor` |
| Изолятор | `Insulator` |
| Атомная структура | `Atomic` |
| Радиостойкий | `RadResistant` |
| В пространстве | `InSpace` |
| Многомерный | `Multidimensional` |
| Во времени | `InTime` |
| Вне времени | `OutOfTime` |
| Якорь времени | `TimeAnchor` |
| Служебные | `Hero`, `Creep`, `Structure`, `Projectile`, `Summon`, `Terrain`, `Neutral` |

## Законы этапа 1

| ID | Дизайн | Код (файл в `content/laws/`) |
|----|--------|------------------------------|
| L2-01 | Импульс | `impulse.ts` |
| L2-02 | Бросок | `throw.ts` |
| L3-01 | Пламя | `flame.ts` |
| L3-02 | Стужа | `frost.ts` |
| L4-01 | Разряд | `discharge.ts` |
| L7-01 | Замедление времени | `timeSlow.ts` |
