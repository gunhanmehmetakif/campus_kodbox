import { describe, expect, it } from "vitest";

import { assignmentGroup, getSubmissionWindow, type AssignmentTiming } from "@/server/assignments/rules";

const now = new Date("2026-10-10T12:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const base: AssignmentTiming = { submissionType: "link", dueAt: null, lateAllowed: false, lateUntil: null };
const group = (a: Partial<AssignmentTiming>, submission: null | { result: unknown }, archived = false) =>
  assignmentGroup({ window: getSubmissionWindow({ ...base, ...a }, now, archived), submission });

describe("assignmentGroup", () => {
  it("teslim yok + pencere açık veya geç: bekleyen", () => {
    expect(group({ dueAt: hours(5) }, null)).toBe("bekleyen");
    expect(group({}, null)).toBe("bekleyen");
    expect(group({ dueAt: hours(-1), lateAllowed: true }, null)).toBe("bekleyen");
  });

  it("teslim var, puan yayınlanmadı: teslim", () => {
    expect(group({ dueAt: hours(5) }, { result: null })).toBe("teslim");
  });

  it("puan yayınlandı: puan", () => {
    expect(group({ dueAt: hours(5) }, { result: { score: 80, maxScore: 100, feedback: null } })).toBe("puan");
  });

  it("teslim gerektirmeyen veya süresi dolmuş ve teslimsiz: diger", () => {
    expect(group({ submissionType: "none" }, null)).toBe("diger");
    expect(group({ dueAt: hours(-1) }, null)).toBe("diger");
    expect(group({ dueAt: hours(-5), lateAllowed: true, lateUntil: hours(-1) }, null)).toBe("diger");
  });

  it("arşivli dersin teslimsiz ödevi diger, teslimli olan grubunu korur", () => {
    expect(group({ dueAt: hours(5) }, null, true)).toBe("diger");
    expect(group({ dueAt: hours(5) }, { result: null }, true)).toBe("teslim");
    expect(group({ dueAt: hours(5) }, { result: { score: 1 } }, true)).toBe("puan");
  });

  it("süresi dolsa da teslim edilmiş ödev diger olmaz", () => {
    expect(group({ dueAt: hours(-5) }, { result: null })).toBe("teslim");
  });
});
