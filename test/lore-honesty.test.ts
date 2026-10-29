import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// docs/01-lore-integrity.md, правило 2: закон не знает «своих» и «чужих».
// Команду читают только условия победы, интерфейс и будущая мутация избирательности.
describe("Лорная честность в коде законов", () => {
	const dir = join(import.meta.dirname, "../packages/content/src/laws");
	const files = readdirSync(dir).filter((name) => name.endsWith(".ts"));

	test("ни один закон не читает команду", () => {
		const violations = files.filter((name) =>
			/\.team\b/.test(readFileSync(join(dir, name), "utf8")),
		);
		expect(violations).toEqual([]);
	});

	test("ни один закон не проверяет имя сущности или id другого закона", () => {
		const violations = files.filter((name) =>
			/\.name\s*===|\.lawId\s*===|lawId\s*:\s*["']/.test(readFileSync(join(dir, name), "utf8")),
		);
		expect(violations).toEqual([]);
	});
});
