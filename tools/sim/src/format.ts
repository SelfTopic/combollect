// Журнал событий по-русски, для человека.

import {
	type Cause,
	cellCenter,
	type EventValue,
	type GameEvent,
	TICKS_PER_SECOND,
	type World,
} from "@combollect/core";
import type { ScriptNote } from "./scenario.ts";

const SYSTEM_NAMES: Readonly<Record<string, string>> = {
	clock: "часы",
	plan: "план",
	law: "закон",
	movement: "удар при столкновении",
	projectile: "полёт",
	thermal: "тепло",
	wetness: "вода",
	conduction: "ток в воде",
	body: "тело",
	trace: "след на карте",
	death: "смерть",
};

const ZONES: Readonly<Record<string, string>> = {
	head: "голова",
	torso: "торс",
	arms: "руки",
	legs: "ноги",
};
const WETNESS: Readonly<Record<string, string>> = {
	dry: "сухой",
	wet: "мокрый",
	soaked: "промокший",
};
const SURFACES: Readonly<Record<string, string>> = {
	ground: "земля",
	grass: "трава",
	stone: "камень",
	water: "вода",
	ice: "лёд",
	scorched: "выжженная земля",
};

function num(value: EventValue | undefined): string {
	if (typeof value === "number") return String(Math.round(value * 100) / 100);
	return String(value);
}

export function formatTime(tick: number): string {
	return `${(tick / TICKS_PER_SECOND).toFixed(2).padStart(6)} с`;
}

export class JournalPrinter {
	private readonly names = new Map<number, string>();

	constructor(private readonly world: World) {}

	private name(id: number | undefined): string {
		if (id === undefined) return "?";
		return `${this.names.get(id) ?? "Сущность"} #${id}`;
	}

	private cell(index: number | undefined): string {
		if (index === undefined) return "клетка ?";
		const center = cellCenter(this.world.grid, index);
		return `клетка (${Math.floor(center.x / 32)}, ${Math.floor(center.y / 32)})`;
	}

	private cause(cause: Cause): string {
		const parts: string[] = [];
		if (cause.lawId !== undefined)
			parts.push(`«${this.world.laws.get(cause.lawId)?.name ?? cause.lawId}»`);
		if (cause.sourceId !== undefined) parts.push(`от ${this.name(cause.sourceId)}`);
		if (cause.system !== undefined) parts.push(SYSTEM_NAMES[cause.system] ?? cause.system);
		return parts.length === 0 ? "" : ` (${parts.join(", ")})`;
	}

	/** Одна строка о событии; null — не печатать. */
	describe(ev: GameEvent): string | null {
		const who = this.name(ev.target);
		const why = this.cause(ev.cause);
		switch (ev.kind) {
			case "entitySpawned": {
				if (ev.target !== undefined) this.names.set(ev.target, ev.note ?? "Сущность");
				const name = this.name(ev.target);
				if (ev.cause.lawId === undefined) return null;
				const frozen = ev.after === 0 ? " — и тут же застывает в воздухе: его часы стоят" : "";
				return `${name} вылетает из руки${why}${frozen}`;
			}
			case "entityRemoved":
				return `${who} исчезает`;
			case "death":
				return `☠ ${who} погибает`;
			case "commandIssued":
				return `${who}: приказ «${ev.note}» → ${ev.after === "в план" ? "дописан в план (сейчас действовать не может)" : "выполняется"}`;
			case "planStep":
				return `${who} выполняет: ${ev.note}`;
			case "planSkipped":
				return `${who} пропускает невозможное: ${ev.note}`;
			case "windupStarted":
				return `${who} начинает подготовку «${ev.note}» (${num(ev.after)} с своего времени) — это видят все`;
			case "windupInterrupted":
				return `${who}: подготовка «${ev.note}» сорвана`;
			case "lawApplied":
				return `${who} применяет «${ev.note}»`;
			case "lawFizzled":
				return `${who}: «${ev.note}» не сработал — цели больше нет`;
			case "cost":
				return `${who} платит ${num(Number(ev.before) - Number(ev.after))} «${ev.note}»`;
			case "timeFieldAdded":
				return `⧗ Время меняет ход: «${ev.note}», множитель ×${num(ev.after)}${why}`;
			case "timeFieldEnded":
				return `⧗ «${ev.note}» закончилось`;
			case "clockRate":
				return null; // печатается группой, см. print()
			case "hitStored":
				return `${who} остановлен: удар записан и ждёт${why}`;
			case "hitsReleased":
				return `${who}: время пошло — ${num(ev.after)} накопленных удара(ов) срабатывают разом`;
			case "health":
				return `${who}: здоровье ${num(ev.before)} → ${num(ev.after)}${why}`;
			case "maxHealth":
				return `${who} стареет: максимум здоровья ${num(ev.before)} → ${num(ev.after)} навсегда${why}`;
			case "bodyZone":
				return `${who}: ${ZONES[ev.note ?? ""] ?? ev.note} ${num(ev.before)}% → ${num(ev.after)}%${why}`;
			case "concussion":
				return `${who}: сотрясение, законы недоступны ${num(ev.after)} с`;
			case "temperature":
				return `${who}: температура ${num(ev.before)}° → ${num(ev.after)}°${why}`;
			case "wetness":
				return `${who}: ${WETNESS[String(ev.before)]} → ${WETNESS[String(ev.after)]}${why}`;
			case "ignited":
				return `🔥 ${who} загорается`;
			case "extinguished":
				return `${who} больше не горит`;
			case "impulse":
				return `${who} получает толчок${why}`;
			case "collision":
				return `${who} врезается в ${this.name(ev.cause.sourceId)}: скорость ${num(ev.before)} → ${num(ev.after)}`;
			case "projectileHit":
				return `${ev.note} попадает → ${who}${why}`;
			case "projectileSpent":
				return `${who} долетел и упал`;
			case "current":
				return `⚡ ${who}: ${ev.note}`;
			case "cellTemperature":
				return `${this.cell(ev.cell)}: температура ${num(ev.before)}° → ${num(ev.after)}°${why}`;
			case "cellSurface":
				return `${this.cell(ev.cell)}: ${SURFACES[String(ev.before)]} → ${SURFACES[String(ev.after)]}${why}`;
			case "cellMoisture":
				return `${this.cell(ev.cell)}: ${ev.after === "wet" ? "намокает" : "высыхает"}${why}`;
			case "cellIgnited":
				return `🔥 ${this.cell(ev.cell)}: трава загорается`;
			case "waterCharged":
				return `⚡ ток остаётся в воде (${num(ev.after)} клеток)${why}`;
		}
	}

	/** Несколько клеток, изменившихся одинаково. */
	private describeCells(ev: GameEvent, count: number): string {
		const one = this.describe({ ...ev, cell: 0 }) ?? "";
		return one.replace(/^клетка \(\d+, \d+\)/, `${count} клеток`);
	}

	/** Весь журнал вместе с репликами сценария. Мелкие непрерывные события — только с `all`. */
	print(notes: readonly ScriptNote[], options: { readonly all?: boolean } = {}): string[] {
		const lines: string[] = [];
		const events = this.world.events.entries;
		let noteIndex = 0;
		let i = 0;
		const flushNotes = (untilTick: number): void => {
			while (noteIndex < notes.length && (notes[noteIndex]?.tick ?? 0) <= untilTick) {
				const note = notes[noteIndex++];
				if (note !== undefined) lines.push(`${formatTime(note.tick)}  ▶ ${note.text}`);
			}
		};
		while (i < events.length) {
			const tick = events[i]?.tick ?? 0;
			flushNotes(tick);
			// Часы, поменявшиеся в один тик, — одной строкой на каждое новое значение,
			// в том месте журнала, где они поменялись.
			const clockGroups = new Map<string, string[]>();
			const cellGroups = new Map<string, { at: number; event: GameEvent; count: number }>();
			let clockAt = -1;
			for (; i < events.length && events[i]?.tick === tick; i++) {
				const ev = events[i];
				if (ev === undefined || (ev.minor === true && options.all !== true)) continue;
				if (ev.kind === "clockRate") {
					if (clockAt < 0) clockAt = lines.length;
					const key = num(ev.after);
					clockGroups.set(key, [...(clockGroups.get(key) ?? []), this.name(ev.target)]);
					continue;
				}
				if (ev.cell !== undefined) {
					// Клетки, изменившиеся одинаково в один тик по одной причине, — одной строкой.
					const key = `${ev.kind}|${num(ev.before)}|${num(ev.after)}|${JSON.stringify(ev.cause)}`;
					const group = cellGroups.get(key);
					if (group === undefined) {
						cellGroups.set(key, { at: lines.length, event: ev, count: 1 });
						lines.push("");
					} else {
						group.count += 1;
					}
					continue;
				}
				const text = this.describe(ev);
				if (text !== null) lines.push(`${formatTime(tick)}  ${text}`);
			}
			for (const { at, event, count } of cellGroups.values()) {
				const text = count === 1 ? this.describe(event) : this.describeCells(event, count);
				lines[at] = `${formatTime(tick)}  ${text ?? ""}`;
			}
			if (clockAt >= 0) {
				const clockLines = [...clockGroups].map(
					([rate, names]) => `${formatTime(tick)}  ⧗ Часы ×${rate}: ${names.join(", ")}`,
				);
				lines.splice(clockAt, 0, ...clockLines);
			}
		}
		flushNotes(Number.POSITIVE_INFINITY);
		return lines;
	}
}
