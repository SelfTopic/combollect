import { issueCommand } from "@combollect/core";
import { eventsOf, runSeconds } from "@combollect/core/testing";
import { describe, expect, test } from "vitest";
import { human, outOfTimeHuman, wolf } from "../src/index.ts";
import { arena, at, cast, must, slotOf } from "./helpers.ts";

const chronist = (x: number, y: number) =>
	outOfTimeHuman(
		{ x, y },
		{ name: "Хронист", laws: ["L7-02"], lore: { name: "Хронос", value: 100 } },
	);

describe("Остановка времени (L7-02)", () => {
	test("Остановка времени: подготовка 1.5 с видна всем в журнале", () => {
		const { world, e } = arena([chronist(100, 100)]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		const windup = eventsOf(world, "windupStarted", e[0]?.id)[0];
		expect(windup?.after).toBe(1.5);
		expect(windup?.note).toBe("Остановка времени");
	});

	test("Остановка времени: всё во времени на всей карте стоит (×0), вне времени — ×1", () => {
		const { world, e } = arena([
			chronist(100, 100),
			wolf({ x: 1200, y: 1200 }),
			outOfTimeHuman({ x: 600, y: 600 }),
		]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		runSeconds(world, 0.1);
		expect(must(e[1]).clock.rate).toBe(0);
		expect(must(e[2]).clock.rate).toBe(1);
		expect(must(e[0]).clock.rate).toBe(1);
	});

	test("Остановка времени: останавливает и союзника во времени", () => {
		const { world, e } = arena([chronist(100, 100), human({ x: 140, y: 100 }, { name: "Мясник" })]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		runSeconds(world, 0.1);
		expect(must(e[1]).clock.rate).toBe(0);
	});

	test("Остановка времени: длится 1.5 с по часам носителя", () => {
		const { world, e } = arena([chronist(100, 100), wolf({ x: 1200, y: 1200 })]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		runSeconds(world, 1.4);
		expect(must(e[1]).clock.rate).toBe(0);
		runSeconds(world, 0.2);
		// Остался временной шрам у носителя, а волк далеко от него — его часы снова ×1.
		expect(must(e[1]).clock.rate).toBe(1);
	});

	test("Остановка времени: носитель стареет на 8% максимума здоровья и платит «Хронос»", () => {
		const { world, e } = arena([chronist(100, 100)]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		expect(must(e[0]).resources.maxHealth).toBeCloseTo(92);
		expect(must(e[0]).resources.lore?.value).toBeCloseTo(40, 0);
	});

	test("Остановка времени: нож, брошенный в остановке, застывает, покинув руку", () => {
		const shadow = outOfTimeHuman({ x: 300, y: 300 }, { name: "Тень", laws: ["L2-02"] });
		const { world, e } = arena([chronist(100, 100), shadow, human({ x: 600, y: 300 })]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		cast(world, must(e[1]), "L2-02", at({ x: 600, y: 300 }));
		const knife = [...world.entities.values()].find((x) => x.name === "Нож");
		expect(knife?.clock.rate).toBe(0);
		const before = knife?.position;
		runSeconds(world, 0.5);
		expect(knife?.position).toEqual(before);
		runSeconds(world, 1.5);
		expect(must(e[2]).resources.health).toBe(80);
	});

	test("Остановка времени: остановленный враг может только дописывать план", () => {
		const { world, e } = arena([chronist(100, 100), human({ x: 600, y: 300 }, { name: "Враг" })]);
		cast(world, must(e[0]), "L7-02", { kind: "none" });
		issueCommand(world, must(e[1]), { kind: "move", to: { x: 900, y: 300 } });
		runSeconds(world, 0.5);
		expect(must(e[1]).position.x).toBe(600);
		expect(must(e[1]).plan).toHaveLength(1);
		expect(slotOf(must(e[0]), "L7-02")).toBe(1);
	});
});
