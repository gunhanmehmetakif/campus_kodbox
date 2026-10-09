import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/routes";
import {
  changePasswordSchema,
  completeRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/server/auth/schemas";

describe("auth schemas", () => {
  it("giriş: kind ve alanları doğrular", () => {
    expect(loginSchema.safeParse({ kind: "student", local: "260000009", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ kind: "other", local: "a", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ kind: "staff", local: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ kind: "staff", local: "a", password: "" }).success).toBe(false);
  });

  it("kayıt ve şifremi unuttum", () => {
    expect(registerSchema.safeParse({ local: " 260000009 " }).data).toEqual({ local: "260000009" });
    expect(registerSchema.safeParse({ local: "" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ kind: "staff", local: "ahmet.yilmaz" }).success).toBe(true);
  });

  it("kayıt tamamlama: şifre kuralı, eşleşme ve KVKK onayı", () => {
    const base = { token: "t", password: "Sifre1234", confirmPassword: "Sifre1234", kvkk: "on" };
    expect(completeRegistrationSchema.safeParse(base).success).toBe(true);
    expect(completeRegistrationSchema.safeParse({ ...base, kvkk: undefined }).success).toBe(false);
    const mismatch = completeRegistrationSchema.safeParse({ ...base, confirmPassword: "Baska1234" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(completeRegistrationSchema.safeParse({ ...base, password: "kisa1", confirmPassword: "kisa1" }).success).toBe(false);
  });

  it("sıfırlama ve değiştirme şemaları token/mevcut şifre ister", () => {
    const pw = { password: "Sifre1234", confirmPassword: "Sifre1234" };
    expect(resetPasswordSchema.safeParse({ ...pw, token: "t" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse(pw).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...pw, currentPassword: "eski" }).success).toBe(true);
    expect(changePasswordSchema.safeParse(pw).success).toBe(false);
  });

  it("open redirect: dış adresler ve // reddedilir", () => {
    expect(safeRedirectPath("https://evil.com", "/ogrenci")).toBe("/ogrenci");
    expect(safeRedirectPath("//evil.com", "/ogrenci")).toBe("/ogrenci");
    expect(safeRedirectPath("/\\evil.com", "/ogrenci")).toBe("/ogrenci");
    expect(safeRedirectPath("/egitmen/dersler", "/ogrenci")).toBe("/egitmen/dersler");
  });
});
