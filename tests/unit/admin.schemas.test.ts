import { describe, expect, it } from "vitest";

import {
  createInstructorSchema,
  createTermSchema,
  setUserStatusSchema,
  updateSchoolSchema,
  updateTermSchema,
} from "@/server/admin/schemas";
import { generateTempPassword } from "@/server/admin/service";

const ID = "7b0f0f56-3f0a-4e5b-9d3b-0a5c1e6f2a11";

describe("admin şemaları", () => {
  it("eğitmen oluşturma: mail yerel kısmı ve görünen ad doğrulanır", () => {
    expect(createInstructorSchema.safeParse({ local: "ahmet.yilmaz", displayName: "Ahmet Yılmaz" }).success).toBe(true);
    expect(createInstructorSchema.safeParse({ local: "ahmet yilmaz!", displayName: "Ahmet" }).success).toBe(false);
    expect(createInstructorSchema.safeParse({ local: "", displayName: "Ahmet" }).success).toBe(false);
    expect(createInstructorSchema.safeParse({ local: "ahmet", displayName: "A" }).success).toBe(false);
  });

  it("durum yalnız active veya disabled olabilir", () => {
    expect(setUserStatusSchema.safeParse({ id: ID, status: "disabled" }).success).toBe(true);
    expect(setUserStatusSchema.safeParse({ id: ID, status: "pending" }).success).toBe(false);
    expect(setUserStatusSchema.safeParse({ id: "x", status: "active" }).success).toBe(false);
  });

  it("dönem: boş tarih alanları yok sayılır, bitiş başlangıçtan önce olamaz", () => {
    const ok = createTermSchema.safeParse({ name: "2026-2027 Güz", startsOn: "", endsOn: "" });
    expect(ok.success).toBe(true);
    expect(ok.data).toEqual({ name: "2026-2027 Güz", startsOn: undefined, endsOn: undefined });

    const bad = createTermSchema.safeParse({ name: "Güz", startsOn: "2026-09-10", endsOn: "2026-09-01" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.path).toEqual(["endsOn"]);

    expect(updateTermSchema.safeParse({ id: ID, name: "Güz", startsOn: "2026-13-45" }).success).toBe(false);
    expect(updateTermSchema.safeParse({ id: ID, name: "Güz", startsOn: "2026-09-14", endsOn: "2027-01-20" }).success).toBe(true);
  });

  it("okul: derlenemeyen regex reddedilir", () => {
    expect(updateSchoolSchema.safeParse({ name: "Okul", studentNoRegex: "^\\d{6,12}$" }).success).toBe(true);
    expect(updateSchoolSchema.safeParse({ name: "Okul", studentNoRegex: "([a-" }).success).toBe(false);
    expect(updateSchoolSchema.safeParse({ name: "Okul", studentNoRegex: "" }).success).toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("12 karakter, okunaklı, harf ve rakam içerir", () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(12);
      expect(pw).not.toMatch(/[0O1lI]/);
      expect(pw).toMatch(/[A-Za-z]/);
      expect(pw).toMatch(/\d/);
    }
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
