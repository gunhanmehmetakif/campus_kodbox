import { z } from "zod";

/**
 * Parola politikası (saf; istemci formlarında canlı ipucu için de kullanılabilir).
 * Kural: en az 8 karakter, en az bir harf ve en az bir rakam. En fazla 128 karakter
 * (argon2'ye aşırı uzun girdi verilmesini önler).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordRules = [
  { id: "length", label: `En az ${PASSWORD_MIN_LENGTH} karakter`, test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  { id: "letter", label: "En az bir harf", test: (v: string) => /\p{L}/u.test(v) },
  { id: "digit", label: "En az bir rakam", test: (v: string) => /\p{Nd}/u.test(v) },
] as const;

export const passwordSchema = z
  .string({ error: "Şifre gir." })
  .min(PASSWORD_MIN_LENGTH, `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`)
  .max(PASSWORD_MAX_LENGTH, `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir.`)
  .refine((v) => /\p{L}/u.test(v), "Şifre en az bir harf içermeli.")
  .refine((v) => /\p{Nd}/u.test(v), "Şifre en az bir rakam içermeli.");

/** Yeni şifre + tekrar alanları için şema (eşleşmezse `confirmPassword` alanına hata yazar). */
export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: "Şifreyi tekrar gir." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor. Aynı şifreyi iki kez yaz.",
  });
