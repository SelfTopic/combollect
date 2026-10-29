import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// Правила ядра из docs/dev/code-style.md: без окружения и детерминированно.
const forbidden: readonly { pattern: RegExp; reason: string }[] = [
	{ pattern: /Math\.random/, reason: "только world.rng" },
	{ pattern: /Date\.now|new Date\b/, reason: "только world.tick и локальные часы" },
	{ pattern: /performance\.now/, reason: "только world.tick и локальные часы" },
	{ pattern: /\bsetTimeout\b|\bsetInterval\b/, reason: "таймеры — в локальном времени" },
	{ pattern: /from ['"]node:|from ['"](fs|path|os)['"]/, reason: "без Node API" },
	{ pattern: /\bwindow\.|\bdocument\./, reason: "без DOM" },
];

function listFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? listFiles(path) : [path];
	});
}

describe("Ядро без окружения и детерминированное", () => {
	const files = listFiles(join(import.meta.dirname, "../packages/core/src"));

	test("в ядре нет запрещённых вызовов", () => {
		const violations: string[] = [];
		for (const file of files) {
			const text = readFileSync(file, "utf8");
			for (const { pattern, reason } of forbidden) {
				if (pattern.test(text)) violations.push(`${file}: ${pattern} (${reason})`);
			}
		}
		expect(violations).toEqual([]);
	});
});
