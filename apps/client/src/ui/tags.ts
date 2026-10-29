// Tab (удерживать): метки и состояния сущности под курсором (docs/10-controls.md).

import { type Entity, effectiveTags } from "@combollect/core";
import { TAG_NAMES, teamName, WETNESS_NAMES, ZONE_NAMES } from "@combollect/journal";
import { byId, escapeHtml } from "./dom.ts";

export function showTags(entity: Entity | null, x: number, y: number): void {
	const panel = byId("tags");
	if (entity === null) {
		panel.classList.add("hidden");
		return;
	}
	const tags = [...effectiveTags(entity)].map((t) => {
		const temporary = !entity.tags.has(t) ? " (пока мокрый)" : "";
		return `<span class="tag">${escapeHtml(TAG_NAMES[t])}${temporary}</span>`;
	});
	const body = entity.state.body;
	const zones =
		body === null
			? ""
			: `<div>Тело: ${(["head", "torso", "arms", "legs"] as const)
					.map((z) => `${ZONE_NAMES[z]} ${Math.round(body[z])}%`)
					.join(", ")}</div>`;
	const s = entity.state;
	panel.innerHTML = `<h4>${escapeHtml(entity.name)} <small style="color:#9aa3ab">(${teamName(entity.team)})</small></h4>
		<div>${tags.join("")}</div>
		<div style="margin-top:4px">Здоровье ${Math.round(entity.resources.health)}/${Math.round(entity.resources.maxHealth)} ·
		часы ×${entity.clock.rate} · ${s.temperature.toFixed(0)}° · ${WETNESS_NAMES[s.wetness]}${s.burning ? " · горит" : ""}
		${s.wounds.length > 0 ? ` · ран: ${s.wounds.length}` : ""}</div>${zones}`;
	panel.style.left = `${Math.min(window.innerWidth - 300, x + 18)}px`;
	panel.style.top = `${Math.min(window.innerHeight - 160, y + 18)}px`;
	panel.classList.remove("hidden");
}
