// Экран победы или поражения при срабатывании условия победы.

import type { TeamId, VictoryResult } from "@combollect/core";
import { byId, escapeHtml } from "./dom.ts";

export function showEnd(result: VictoryResult, playerTeam: TeamId, onAgain: () => void): void {
	const title =
		result.winner === null ? "Ничья" : result.winner === playerTeam ? "Победа!" : "Поражение";
	const color = result.winner === playerTeam ? "#e0b03a" : "#ff6b6b";
	const root = byId("end");
	root.innerHTML = `<h1 style="color:${color}">${title}</h1><div class="reason">${escapeHtml(result.reason)}</div>
		<div class="reason">Почему — смотрите журнал справа.</div><button class="start" id="again">Новый матч</button>`;
	root.classList.remove("hidden");
	byId("again").addEventListener("click", () => {
		root.classList.add("hidden");
		onAgain();
	});
}
