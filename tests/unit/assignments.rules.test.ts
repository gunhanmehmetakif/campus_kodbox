import { describe, expect, it } from "vitest";

import {
  getSubmissionWindow,
  isAllowedSubmissionHost,
  isLateAt,
  parseIstanbulLocal,
  suggestScore,
  toIstanbulLocalInput,
  type AssignmentTiming,
} from "@/server/assignments/rules";
import { saveAssignmentSchema } from "@/server/assignments/schemas";

const T = (iso: string) => new Date(iso);
const base: AssignmentTiming = { submissionType: "link", dueAt: null, lateAllowed: false, lateUntil: null };
const due = T("2026-10-14T20:59:00Z");

describe("getSubmissionWindow", () => {
  it("teslim gerekmeyen ödev", () => {
    expect(getSubmissionWindow({ ...base, submissionType: "none" }, due, false)).toEqual({ state: "no_submission" });
  });
  it("süresiz ödev açıktır", () => {
    expect(getSubmissionWindow(base, due, false)).toEqual({ state: "open", closesAt: null });
  });
  it("süre dolmadan açık, tam sınırda hâlâ açık", () => {
    const a = { ...base, dueAt: due };
    expect(getSubmissionWindow(a, T("2026-10-10T00:00:00Z"), false)).toEqual({ state: "open", closesAt: due });
    expect(getSubmissionWindow(a, due, false).state).toBe("open");
  });
  it("süre doldu, geç teslim kapalı", () => {
    expect(getSubmissionWindow({ ...base, dueAt: due }, T("2026-10-15T00:00:00Z"), false)).toEqual({ state: "closed" });
  });
  it("geç teslim sınırsız ve sınırlı", () => {
    const after = T("2026-10-15T00:00:00Z");
    expect(getSubmissionWindow({ ...base, dueAt: due, lateAllowed: true }, after, false)).toEqual({
      state: "late",
      closesAt: null,
    });
    const until = T("2026-10-16T20:59:00Z");
    const limited = { ...base, dueAt: due, lateAllowed: true, lateUntil: until };
    expect(getSubmissionWindow(limited, after, false)).toEqual({ state: "late", closesAt: until });
    expect(getSubmissionWindow(limited, T("2026-10-17T00:00:00Z"), false)).toEqual({ state: "closed" });
  });
  it("arşivli derste her zaman kapalı", () => {
    expect(getSubmissionWindow(base, due, true)).toEqual({ state: "closed" });
  });
});

describe("isLateAt", () => {
  it("dueAt yoksa geç değil, sonrasında geç", () => {
    expect(isLateAt(base, due)).toBe(false);
    expect(isLateAt({ ...base, dueAt: due }, due)).toBe(false);
    expect(isLateAt({ ...base, dueAt: due }, new Date(due.getTime() + 1))).toBe(true);
  });
});

describe("suggestScore", () => {
  it("geç değilse veya ceza yoksa ham puan", () => {
    expect(suggestScore(80, { type: "percent", value: 10 }, false)).toBe(80);
    expect(suggestScore(80, { type: "none", value: null }, true)).toBe(80);
  });
  it("yüzde ve puan cezası", () => {
    expect(suggestScore(80, { type: "percent", value: 10 }, true)).toBe(72);
    expect(suggestScore(80, { type: "points", value: 5 }, true)).toBe(75);
    expect(suggestScore(33.33, { type: "percent", value: 15 }, true)).toBe(28.33);
  });
  it("0 altına düşmez", () => {
    expect(suggestScore(3, { type: "points", value: 10 }, true)).toBe(0);
  });
});

describe("isAllowedSubmissionHost", () => {
  it("yalnız Drive/Docs ve http(s)", () => {
    expect(isAllowedSubmissionHost("https://drive.google.com/file/d/1/view", false)).toBe(true);
    expect(isAllowedSubmissionHost("https://docs.google.com/document/d/1", false)).toBe(true);
    expect(isAllowedSubmissionHost("https://evil.com/drive.google.com", false)).toBe(false);
    expect(isAllowedSubmissionHost("https://drive.google.com.evil.com/x", false)).toBe(false);
    expect(isAllowedSubmissionHost("https://github.com/x/y", false)).toBe(false);
    expect(isAllowedSubmissionHost("https://github.com/x/y", true)).toBe(true);
    expect(isAllowedSubmissionHost("javascript:alert(1)", true)).toBe(false);
    expect(isAllowedSubmissionHost("ftp://drive.google.com/x", true)).toBe(false);
    expect(isAllowedSubmissionHost("not a url", true)).toBe(false);
  });
});

describe("Istanbul dönüşümü", () => {
  it("+03:00 ile UTC'ye çevirir ve geri döner", () => {
    const d = parseIstanbulLocal("2026-10-14T23:59");
    expect(d.toISOString()).toBe("2026-10-14T20:59:00.000Z");
    expect(toIstanbulLocalInput(d)).toBe("2026-10-14T23:59");
  });
  it("gün sınırı: 01:30 İstanbul önceki günün UTC'sidir", () => {
    expect(parseIstanbulLocal("2026-01-01T01:30").toISOString()).toBe("2025-12-31T22:30:00.000Z");
  });
  it("geçersiz girdiyi reddeder", () => {
    expect(() => parseIstanbulLocal("2026-13-01T10:00")).toThrow();
    expect(() => parseIstanbulLocal("2026-02-30T10:00")).toThrow();
    expect(() => parseIstanbulLocal("garbage")).toThrow();
  });
});

describe("saveAssignmentSchema", () => {
  const valid = {
    courseId: "5b1f1c9e-3d7a-4a53-9c6f-0f1d8f9b2a11",
    title: "Ödev 1",
    submissionType: "link",
    intent: "draft",
  };
  it("temel geçerli form", () => {
    expect(saveAssignmentSchema.safeParse(valid).success).toBe(true);
  });
  it("geç teslim için son teslim tarihi gerekir", () => {
    expect(saveAssignmentSchema.safeParse({ ...valid, lateAllowed: "on" }).success).toBe(false);
  });
  it("geç teslim son tarihi son tesliminden sonra olmalı", () => {
    const r = saveAssignmentSchema.safeParse({
      ...valid,
      dueAt: "2026-10-14T23:59",
      lateAllowed: "on",
      lateUntil: "2026-10-14T23:00",
    });
    expect(r.success).toBe(false);
  });
  it("ceza yüzdesi 0-100, puanlamada maxScore sınırları", () => {
    const late = { ...valid, dueAt: "2026-10-14T23:59", lateAllowed: "on" };
    expect(saveAssignmentSchema.safeParse({ ...late, latePenaltyType: "percent", latePenaltyValue: "101" }).success).toBe(
      false,
    );
    expect(saveAssignmentSchema.safeParse({ ...late, latePenaltyType: "percent", latePenaltyValue: "10" }).success).toBe(
      true,
    );
    expect(saveAssignmentSchema.safeParse({ ...valid, grading: "on", maxScore: "0" }).success).toBe(false);
    expect(saveAssignmentSchema.safeParse({ ...valid, grading: "on", maxScore: "1001" }).success).toBe(false);
    expect(saveAssignmentSchema.safeParse({ ...valid, grading: "on", maxScore: "100" }).success).toBe(true);
  });
});
