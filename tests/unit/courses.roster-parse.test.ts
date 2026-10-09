import { describe, expect, it } from "vitest";

import { parseRosterText } from "@/server/courses/roster-parse";
import {
  addRosterSchema,
  createCourseSchema,
  normalizeCourseCode,
  savePostSchema,
  setCourseArchivedSchema,
} from "@/server/courses/schemas";

const REGEX = "^\\d{6,12}$";

describe("parseRosterText", () => {
  it("parses one number per line", () => {
    const r = parseRosterText("260000009\n260000010\r\n260000011", REGEX);
    expect(r.valid.map((v) => v.studentNo)).toEqual(["260000009", "260000010", "260000011"]);
    expect(r.invalid).toEqual([]);
  });

  it("takes the rest of the line as the name (space, TAB, comma)", () => {
    const r = parseRosterText(
      "260000009  Ayşe Yılmaz\n260000010\tMehmet Demir\n260000011, Can   Öz ",
      REGEX,
    );
    expect(r.valid).toEqual([
      { studentNo: "260000009", displayName: "Ayşe Yılmaz" },
      { studentNo: "260000010", displayName: "Mehmet Demir" },
      { studentNo: "260000011", displayName: "Can Öz" },
    ]);
  });

  it("splits lines made only of numbers by comma, semicolon and space", () => {
    const r = parseRosterText("260000009, 260000010;260000011 260000012", REGEX);
    expect(r.valid.map((v) => v.studentNo)).toEqual(["260000009", "260000010", "260000011", "260000012"]);
    expect(r.valid.every((v) => v.displayName === null)).toBe(true);
  });

  it("collects invalid lines and tokens as written", () => {
    const r = parseRosterText("abc\n123\n260000009 Ali\n260000010, 12\nxyz Veli", REGEX);
    expect(r.valid.map((v) => v.studentNo)).toEqual(["260000009", "260000010"]);
    expect(r.invalid).toEqual(["abc", "123", "12", "xyz Veli"]);
  });

  it("dedupes within the text; the last name wins and an empty later name keeps the earlier one", () => {
    const r = parseRosterText("260000009 Eski Ad\n260000009 Yeni Ad\n260000010 Ali\n260000010", REGEX);
    expect(r.valid).toEqual([
      { studentNo: "260000009", displayName: "Yeni Ad" },
      { studentNo: "260000010", displayName: "Ali" },
    ]);
  });

  it("skips blank lines and trims names to 120 characters", () => {
    const long = "A".repeat(200);
    const r = parseRosterText(`\n\n   \n260000009 ${long}\n`, REGEX);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0]!.displayName).toHaveLength(120);
  });

  it("processes at most 1000 numbers per call", () => {
    const text = Array.from({ length: 1200 }, (_, i) => String(100000 + i)).join("\n");
    const r = parseRosterText(text, REGEX);
    expect(r.valid).toHaveLength(1000);
  });

  it("treats a broken school regex as every number invalid", () => {
    const r = parseRosterText("260000009", "(");
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual(["260000009"]);
  });
});

describe("course schemas", () => {
  const uuid = "11111111-1111-4111-8111-111111111111";

  it("normalizes the course code (tr-TR upper case, no spaces)", () => {
    expect(normalizeCourseCode(" bil 101 ")).toBe("BİL101");
    const r = createCourseSchema.safeParse({ code: "bil 101", name: " Programlama ", termId: uuid });
    expect(r.success && r.data.code).toBe("BİL101");
    expect(r.success && r.data.name).toBe("Programlama");
  });

  it("parses archived flag", () => {
    expect(setCourseArchivedSchema.parse({ id: uuid, archived: "true" }).archived).toBe(true);
    expect(setCourseArchivedSchema.safeParse({ id: uuid, archived: "x" }).success).toBe(false);
  });

  it("rejects empty roster text", () => {
    expect(addRosterSchema.safeParse({ courseId: uuid, text: "  \n " }).success).toBe(false);
  });

  it("validates post links: JSON, http(s) only, max 20", () => {
    const base = { courseId: uuid, type: "announcement", title: "Başlık", bodyMd: "", intent: "draft" };
    const ok = savePostSchema.safeParse({
      ...base,
      links: JSON.stringify([{ title: "Drive", url: "https://drive.google.com/x" }]),
    });
    expect(ok.success && ok.data.links).toHaveLength(1);
    expect(savePostSchema.safeParse({ ...base, links: "" }).success).toBe(true);
    expect(
      savePostSchema.safeParse({ ...base, links: JSON.stringify([{ title: "x", url: "javascript:alert(1)" }]) }).success,
    ).toBe(false);
    expect(savePostSchema.safeParse({ ...base, links: "not json" }).success).toBe(false);
    const many = Array.from({ length: 21 }, () => ({ title: "x", url: "https://a.com" }));
    expect(savePostSchema.safeParse({ ...base, links: JSON.stringify(many) }).success).toBe(false);
  });
});
