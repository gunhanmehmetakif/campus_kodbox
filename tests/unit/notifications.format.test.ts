import { describe, expect, it } from "vitest";

import { formatNotification } from "@/lib/notification-format";

const base = { courseId: "c1", courseCode: "BİL101", assignmentId: "a1", title: "Ödev 1" };
const FALLBACK = { title: "Bildirim", body: "", href: "/bildirimler", icon: "post" };

describe("formatNotification", () => {
  it("course.enrolled", () => {
    expect(formatNotification("course.enrolled", { courseId: "c1", courseCode: "BİL101", courseName: "Veri Yapıları" })).toEqual({
      title: "BİL101 dersine eklendiniz",
      body: "Veri Yapıları",
      href: "/ogrenci/dersler/c1",
      icon: "course",
    });
  });

  it("post.published for announcement and material", () => {
    const p = { courseId: "c1", courseCode: "BİL101", postId: "p1", title: "Sınav yeri" };
    const a = formatNotification("post.published", { ...p, postType: "announcement" });
    expect(a.title).toBe("BİL101 · Yeni duyuru");
    expect(a.href).toBe("/ogrenci/dersler/c1?sekme=akis#post-p1");
    expect(formatNotification("post.published", { ...p, postType: "material" }).title).toBe("BİL101 · Yeni materyal");
  });

  it("assignment.published with and without a deadline (Istanbul time)", () => {
    const withDue = formatNotification("assignment.published", { ...base, dueAt: "2026-10-14T18:03:00Z" });
    expect(withDue).toEqual({
      title: "BİL101 · Yeni ödev",
      body: "Ödev 1 · Son teslim 14 Eki 21:03",
      href: "/ogrenci/odevler/a1",
      icon: "assignment",
    });
    expect(formatNotification("assignment.published", { ...base, dueAt: null }).body).toBe("Ödev 1");
  });

  it("assignment.dates_changed", () => {
    const changed = formatNotification("assignment.dates_changed", {
      ...base,
      dueAt: "2026-10-14T18:03:00Z",
      lateUntil: null,
    });
    expect(changed.title).toBe("BİL101 · Ödev tarihi değişti");
    expect(changed.body).toBe("Ödev 1 · Yeni son teslim 14 Eki 21:03");
    expect(changed.icon).toBe("deadline");
    expect(formatNotification("assignment.dates_changed", { ...base, dueAt: null, lateUntil: null }).body).toBe(
      "Ödev 1 · Süresiz",
    );
  });

  it("assignment.due_soon", () => {
    expect(formatNotification("assignment.due_soon", { ...base, dueAt: "2026-10-14T18:03:00Z" })).toEqual({
      title: "BİL101 · Son 24 saat",
      body: "Ödev 1 · Son teslim 14 Eki 21:03",
      href: "/ogrenci/odevler/a1",
      icon: "deadline",
    });
  });

  it("submission.score_published", () => {
    expect(formatNotification("submission.score_published", base)).toEqual({
      title: "BİL101 · Puanınız yayınlandı",
      body: "Ödev 1",
      href: "/ogrenci/odevler/a1",
      icon: "score",
    });
  });

  it("falls back for unknown types and broken payloads without throwing", () => {
    expect(formatNotification("something.else", {})).toEqual(FALLBACK);
    expect(formatNotification("assignment.due_soon", {})).toEqual(FALLBACK);
    expect(formatNotification("assignment.due_soon", { ...base, dueAt: "not a date" })).toEqual(FALLBACK);
    expect(formatNotification("course.enrolled", { courseId: 5 })).toEqual(FALLBACK);
    expect(formatNotification("post.published", null as unknown as Record<string, unknown>)).toEqual(FALLBACK);
  });
});
