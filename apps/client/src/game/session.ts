// Матч в клиенте: мир, свои герои, интерполяция позиций. Вся логика — в core и content;
// клиент только тикает мир и превращает ввод в команды.

import {
	createMatch,
	type HeroDef,
	heroById,
	type Match,
	type MatchOptions,
} from "@combollect/content";
import {
	type Entity,
	type EntityId,
	type GameEvent,
	isAlive,
	issueCommand,
	type PlannedAction,
	step,
	type Vec2,
	type World,
} from "@combollect/core";

export class Session {
	readonly match: Match;
	/** Какой герой из content/heroes стоит за сущностью — для вида и клавиш законов. */
	readonly defs = new Map<EntityId, HeroDef>();
	/** Какой из своих героев сейчас под управлением (клавиши 1, 2, 3). */
	selected = 0;
	private previous = new Map<EntityId, Vec2>();
	private consumed = 0;

	constructor(options: MatchOptions) {
		this.match = createMatch(options);
		this.match.allies.forEach((hero, i) => {
			const id = options.allies[i];
			if (id !== undefined) this.defs.set(hero.id, heroById(id));
		});
		this.defs.set(this.match.enemy.id, heroById(options.enemy));
	}

	get world(): World {
		return this.match.world;
	}

	/** Свои герои: живые и мёртвые, в порядке клавиш. */
	get heroes(): readonly Entity[] {
		return this.match.allies;
	}

	selectedHero(): Entity | undefined {
		const hero = this.match.allies[this.selected];
		return hero !== undefined && isAlive(hero) ? hero : undefined;
	}

	select(index: number): void {
		const hero = this.match.allies[index];
		if (hero !== undefined && isAlive(hero)) this.selected = index;
	}

	/** Один тик мира. Позиции до тика запоминаются для интерполяции. */
	tick(): void {
		this.previous.clear();
		for (const entity of this.world.entities.values())
			this.previous.set(entity.id, entity.position);
		step(this.world);
	}

	/** Где рисовать сущность между тиками. */
	renderPosition(entity: Entity, alpha: number): Vec2 {
		const from = this.previous.get(entity.id) ?? entity.position;
		const to = entity.position;
		return { x: from.x + (to.x - from.x) * alpha, y: from.y + (to.y - from.y) * alpha };
	}

	/** События, появившиеся с прошлого вызова. */
	takeEvents(): GameEvent[] {
		const entries = this.world.events.entries;
		const fresh = entries.slice(this.consumed);
		this.consumed = entries.length;
		return fresh;
	}

	command(action: PlannedAction, queue: boolean): void {
		const hero = this.selectedHero();
		if (hero !== undefined) issueCommand(this.world, hero, action, { queue });
	}
}
