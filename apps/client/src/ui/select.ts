// Экран выбора: герои своей команды и герой-враг (docs/dev/stage-2.md).

import { type MatchOptions, stage2Heroes } from "@combollect/content";
import { TAG_NAMES } from "@combollect/journal";
import { byId, escapeHtml } from "./dom.ts";

const NONE = "";

function options(selected: string, allowNone: boolean): string {
	const none = allowNone ? `<option value="${NONE}">— никого —</option>` : "";
	return (
		none +
		stage2Heroes
			.map(
				(h) => `<option value="${h.id}" ${h.id === selected ? "selected" : ""}>${h.name}</option>`,
			)
			.join("")
	);
}

function card(heroId: string): string {
	const hero = stage2Heroes.find((h) => h.id === heroId);
	if (hero === undefined) return "";
	const tags = hero.tags.map((t) => TAG_NAMES[t]).join(", ");
	return `<div class="card"><h4>${escapeHtml(hero.name)}</h4>
		<div class="lore">${escapeHtml(hero.lore)}</div>
		<div><b>Метки:</b> ${escapeHtml(tags)}</div>
		<div><b>Ресурс:</b> ${escapeHtml(hero.resource.name)}</div>
		<div><b>Сильные стороны:</b> ${escapeHtml(hero.strengths)}</div>
		<div><b>Слабости:</b> ${escapeHtml(hero.weaknesses)}</div>
		<div><b>Цена силы:</b> ${escapeHtml(hero.priceOfPower)}</div></div>`;
}

export function showSelect(onStart: (options: MatchOptions) => void): void {
	const root = byId("select");
	root.classList.remove("hidden");
	root.innerHTML = `
		<h1>Combollect — арена</h1>
		<div class="sub">Этап 2. Ты управляешь всей своей командой (клавиши 1, 2, 3). Враг стоит у своего трона.
		Цель — уничтожить вражеский трон.</div>
		<div class="pick-row">
			<div class="pick west"><h3>Своя команда (Запад), герой 1</h3><select id="ally0">${options("chronist", true)}</select></div>
			<div class="pick west"><h3>Герой 2</h3><select id="ally1">${options("shadow", true)}</select></div>
			<div class="pick west"><h3>Герой 3</h3><select id="ally2">${options("butcher", true)}</select></div>
			<div class="pick east"><h3>Враг (Восток), стоит на месте</h3><select id="enemy">${options("butcher", false)}</select></div>
		</div>
		<button class="start" id="start">В бой</button>
		<div class="cards">${stage2Heroes.map((h) => card(h.id)).join("")}</div>
		<div class="help">
			<kbd>ПКМ</kbd> идти / атаковать врага · <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> закон, затем <kbd>ЛКМ</kbd> — куда
			(законы времени — сразу) · <kbd>Shift</kbd> + действие — дописать в план ·
			<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> выбрать героя · держать <kbd>Tab</kbd> — метки под курсором ·
			<kbd>Esc</kbd> отменить прицел · <kbd>Пробел</kbd> пауза
		</div>`;
	byId("start").addEventListener("click", () => {
		const allies = ["ally0", "ally1", "ally2"]
			.map((id) => byId<HTMLSelectElement>(id).value)
			.filter((v) => v !== NONE);
		const enemy = byId<HTMLSelectElement>("enemy").value;
		if (allies.length === 0) return;
		root.classList.add("hidden");
		onStart({ allies, enemy });
	});
}
