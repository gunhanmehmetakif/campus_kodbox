import { describe, expect, it } from "vitest";

import { computeDeadline, computeRibbonGeometry } from "./deadline";

const now = new Date("2026-10-09T09:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);
const d = (n: number) => h(n * 24);

describe("computeDeadline", () => {
  it("süresiz", () => {
    expect(computeDeadline({ publishAt: d(-1), dueAt: null }, now).status).toBe("open-ended");
  });

  it("normal (>48 saat) → laurel", () => {
    const s = computeDeadline({ publishAt: d(-2), dueAt: d(5) }, now);
    expect(s).toMatchObject({ status: "upcoming", tone: "laurel", needsSecondTicks: false });
    expect(s.remainingMs).toBe(5 * 86_400_000);
  });

  it("son 48 saat → saffron; son 1 saat → saniyelik", () => {
    expect(computeDeadline({ publishAt: d(-2), dueAt: h(47) }, now)).toMatchObject({ status: "due-soon", tone: "saffron" });
    expect(computeDeadline({ publishAt: d(-2), dueAt: h(0.5) }, now).needsSecondTicks).toBe(true);
  });

  it("gecikmiş (geç teslim kapalı) → brick", () => {
    expect(computeDeadline({ publishAt: d(-5), dueAt: d(-1) }, now)).toMatchObject({ status: "overdue", tone: "brick" });
  });

  it("geç teslim penceresi", () => {
    const s = computeDeadline({ publishAt: d(-5), dueAt: d(-1), lateAllowed: true, lateUntil: d(2) }, now);
    expect(s).toMatchObject({ status: "late-window", tone: "brick" });
    expect(s.targetAt).toEqual(d(2));
    expect(s.remainingMs).toBe(2 * 86_400_000);
  });

  it("geç teslim penceresi bitti → overdue", () => {
    expect(computeDeadline({ publishAt: d(-5), dueAt: d(-3), lateAllowed: true, lateUntil: d(-1) }, now).status).toBe("overdue");
  });

  it("süresiz geç teslim", () => {
    expect(computeDeadline({ publishAt: d(-5), dueAt: d(-3), lateAllowed: true, lateUntil: null }, now).status).toBe("late-window");
  });

  it("teslim edildi → sky; geç teslim işaretlenir", () => {
    expect(computeDeadline({ publishAt: d(-5), dueAt: d(1), submittedAt: h(-1) }, now)).toMatchObject({
      status: "submitted",
      tone: "sky",
      submittedLate: false,
    });
    expect(
      computeDeadline({ publishAt: d(-5), dueAt: d(-1), lateAllowed: true, lateUntil: d(1), submittedAt: h(-1) }, now).submittedLate,
    ).toBe(true);
  });

  it("zamanlanmış (yayın gelecekte)", () => {
    expect(computeDeadline({ publishAt: d(2), dueAt: d(9) }, now).status).toBe("scheduled");
  });
});

describe("computeRibbonGeometry", () => {
  it("süresiz ödevde şerit yok", () => {
    expect(computeRibbonGeometry({ publishAt: d(-1), dueAt: null }, now)).toBeNull();
  });

  it("yayın → son tarih doğrusal; şimdi ortada", () => {
    const g = computeRibbonGeometry({ publishAt: d(-5), dueAt: d(5) }, now)!;
    expect(g.due).toBe(1);
    expect(g.now).toBeCloseTo(0.5);
    expect(g.lateEnd).toBeNull();
  });

  it("geç teslim penceresi genişliğin %18–35'i", () => {
    const g = computeRibbonGeometry({ publishAt: d(-10), dueAt: d(-1), lateAllowed: true, lateUntil: d(30) }, now)!;
    expect(g.due).toBeCloseTo(0.65);
    expect(g.lateEnd).toBe(1);
    expect(g.now).toBeGreaterThan(g.due);
  });

  it("şimdi eksenin dışındaysa kıstırılır", () => {
    const g = computeRibbonGeometry({ publishAt: d(2), dueAt: d(9) }, now)!;
    expect(g.now).toBe(0);
    expect(g.nowOutside).toBe("before");
  });

  it("ortak eksen (bugün → +14 gün)", () => {
    const g = computeRibbonGeometry({ publishAt: d(-3), dueAt: d(7) }, now, { start: now, end: d(14) })!;
    expect(g.now).toBe(0);
    expect(g.due).toBeCloseTo(0.5);
  });
});
