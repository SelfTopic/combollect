// Журнал событий на экране: «понятно, почему я проиграл». Тексты — из общего пакета журнала.

import { type GameEvent, TICKS_PER_SECOND, type World } from "@combollect/core";
import { JournalPrinter } from "@combollect/journal";
import { byId, escapeHtml } from "./dom.ts";

const MAX_LINES = 22;
/** Шум, который мешает читать бой: приказы, оплата, шаги плана, клетки. */
const HIDDEN = new Set<string>(["commandIssued", "planStep", "cost", "clockRate", "entityRemoved"]);

export class JournalFeed {
	private readonly printer: JournalPrinter;
	private readonly lines: string[] = [];
	private dirty = true;

	constructor(private readonly world: World) {
		this.printer = new JournalPrinter(world);
	}

	consume(events: readonly GameEvent[]): void {
		const stops = new Map<number, number>();
		for (const ev of events) {
			// Имена запоминаются в describe(), поэтому его зовём для всех событий.
			const text = this.printer.describe(ev);
			if (ev.kind === "clockRate") {
				const key = Number(ev.after);
				stops.set(key, (stops.get(key) ?? 0) + 1);
				continue;
			}
			if (text === null || ev.minor === true || ev.cell !== undefined || HIDDEN.has(ev.kind))
				continue;
			this.push(ev.tick, text);
		}
		for (const [rate, count] of stops) {
			const tick = events[events.length - 1]?.tick ?? 0;
			this.push(tick, `⧗ Часы ×${rate}: ${count} сущн.`);
		}
	}

	/** Замах и применение базовой атаки — каждую секунду; урон от неё всё равно виден. */
	private isBasicAttackNoise(ev: GameEvent): boolean {
		if (ev.kind !== "windupStarted" && ev.kind !== "lawApplied") return false;
		const law = ev.cause.lawId === undefined ? undefined : this.world.laws.get(ev.cause.lawId);
		return law?.basicAttack === true;
	}

	private push(tick: number, text: string): void {
		const time = (tick / TICKS_PER_SECOND).toFixed(1);
		this.lines.push(`<span class="t">${time}</span>${escapeHtml(text)}`);
		if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES);
		this.dirty = true;
	}

	render(): void {
		if (!this.dirty) return;
		this.dirty = false;
		byId("journal").innerHTML = this.lines.map((l) => `<div>${l}</div>`).join("");
	}
}
