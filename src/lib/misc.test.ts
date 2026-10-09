import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formValues, parseForm } from "./action-state";
import { detectLinkKind, isGoogleDriveLink } from "./links";
import { newPasswordSchema, passwordSchema } from "./password-policy";
import { homePathForRole, isProtectedPath, loginUrl, safeRedirectPath } from "./routes";

describe("routes", () => {
  it("rol ana sayfaları", () => {
    expect(homePathForRole("student")).toBe("/ogrenci");
    expect(homePathForRole("instructor")).toBe("/egitmen");
    expect(homePathForRole("admin")).toBe("/admin");
  });

  it("korumalı yollar", () => {
    expect(isProtectedPath("/ogrenci")).toBe(true);
    expect(isProtectedPath("/admin/egitmenler")).toBe(true);
    expect(isProtectedPath("/giris")).toBe(false);
    expect(isProtectedPath("/adminx")).toBe(false);
  });

  it("açık yönlendirmeyi engeller", () => {
    expect(safeRedirectPath("/egitmen/dersler")).toBe("/egitmen/dersler");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("/a\nb")).toBe("/");
    expect(safeRedirectPath(undefined, "/giris")).toBe("/giris");
    expect(loginUrl("/ogrenci?x=1")).toBe("/giris?next=%2Fogrenci%3Fx%3D1");
    expect(loginUrl("/")).toBe("/giris");
  });
});

describe("password-policy", () => {
  it("en az 8 karakter, harf ve rakam", () => {
    expect(passwordSchema.safeParse("abc12345").success).toBe(true);
    expect(passwordSchema.safeParse("şifre2026").success).toBe(true);
    expect(passwordSchema.safeParse("abc1234").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("tekrar alanı eşleşmeli", () => {
    const r = newPasswordSchema.safeParse({ password: "abc12345", confirmPassword: "abc12346" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("links", () => {
  it("link türünü tanır", () => {
    expect(detectLinkKind("https://drive.google.com/file/d/x/view")).toBe("drive-file");
    expect(detectLinkKind("https://drive.google.com/drive/folders/x")).toBe("drive-folder");
    expect(detectLinkKind("https://docs.google.com/spreadsheets/d/x")).toBe("sheets");
    expect(detectLinkKind("https://youtu.be/x")).toBe("youtube");
    expect(detectLinkKind("https://example.com")).toBe("generic");
    expect(detectLinkKind("javascript:alert(1)")).toBe("generic");
  });

  it("teslim linki Drive/Docs olmalı (https)", () => {
    expect(isGoogleDriveLink("https://drive.google.com/file/d/x/view")).toBe(true);
    expect(isGoogleDriveLink("https://docs.google.com/document/d/x")).toBe(true);
    expect(isGoogleDriveLink("http://drive.google.com/file/d/x")).toBe(false);
    expect(isGoogleDriveLink("https://drive.google.com.evil.com/x")).toBe(false);
    expect(isGoogleDriveLink("https://evil.com/drive.google.com")).toBe(false);
  });
});

describe("action-state", () => {
  it("parseForm başarılı/başarısız; şifreleri geri döndürmez", () => {
    const schema = z.object({ code: z.string().min(3, "Ders kodu en az 3 karakter olmalı."), password: z.string() });
    const fd = new FormData();
    fd.set("code", "B1");
    fd.set("password", "gizli");
    const r = parseForm(schema, fd);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.result.fieldErrors?.code).toEqual(["Ders kodu en az 3 karakter olmalı."]);
      expect(r.result.values).toEqual({ code: "B1" });
    }
    fd.set("code", "BİL101");
    expect(parseForm(schema, fd)).toEqual({ ok: true, data: { code: "BİL101", password: "gizli" } });
  });

  it("aynı isimli alanları diziye toplar", () => {
    const fd = new FormData();
    fd.append("tag", "a");
    fd.append("tag", "b");
    const r = parseForm(z.object({ tag: z.array(z.string()) }), fd);
    expect(r).toEqual({ ok: true, data: { tag: ["a", "b"] } });
    expect(formValues(fd)).toEqual({ tag: "b" });
  });
});
