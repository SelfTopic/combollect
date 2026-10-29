import { bleeding, createMatch, fracture, strike, timeStop } from "@combollect/content";
import { describe, expect, test } from "vitest";
import { noEffectReason, targetsEntity } from "../src/game/targeting.ts";

const world = () => createMatch({ allies: ["butcher"], enemy: "chronist" });

function named(m: ReturnType<typeof world>, name: string) {
	const entity = [...m.world.entities.values()].find((e) => e.name === name);
	if (entity === undefined) throw new Error(name);
	return entity;
}

describe("Подсказка «не подействует»", () => {
	test("Кровотечение на трон: нет метки «Кровь»", () => {
		const m = world();
		expect(noEffectReason(bleeding, named(m, "Трон Востока"))).toBe("нет метки «Кровь»");
	});

	test("Перелом на камень: нет метки «Конечности»", () => {
		const m = world();
		expect(noEffectReason(fracture, named(m, "Камень"))).toBe("нет метки «Конечности»");
	});

	test("Кровотечение на героя — подействует", () => {
		const m = world();
		expect(noEffectReason(bleeding, m.enemy)).toBeNull();
	});

	test("Остановка времени на Хрониста: он не «во времени»", () => {
		const m = world();
		expect(noEffectReason(timeStop, m.enemy)).toBe("нет метки «Во времени»");
	});

	test("Подсказка нужна законам, которые бьют того, на кого наведены", () => {
		expect(targetsEntity(strike)).toBe(true);
		expect(targetsEntity(timeStop)).toBe(false);
	});
});
