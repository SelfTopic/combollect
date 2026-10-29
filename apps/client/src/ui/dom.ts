// Мелкие помощники для HTML-интерфейса.

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (element === null) throw new Error(`Нет элемента #${id}`);
	return element as T;
}

export function escapeHtml(text: string): string {
	return text.replace(
		/[&<>"]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
	);
}
