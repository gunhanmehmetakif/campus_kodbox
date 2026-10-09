import { z } from "zod";

import { newPasswordSchema, passwordSchema } from "@/lib/password-policy";

/**
 * Auth form schemas (docs/fazlar/F1-kimlik.md section 1). Pure module: safe for client-side
 * live validation. Field names match the form field names.
 */

const kind = z.enum(["student", "staff"], { error: "Hesap türünü seçin." });
const local = z
  .string({ error: "Mail adresini girin." })
  .trim()
  .min(1, "Mail adresini girin.")
  .max(254, "Mail adresi çok uzun.");
const studentNo = z
  .string({ error: "Öğrenci numaranızı girin." })
  .trim()
  .min(1, "Öğrenci numaranızı girin.")
  .max(254, "Öğrenci numarası çok uzun.");
const token = z.string({ error: "Geçersiz bağlantı." }).min(1, "Geçersiz bağlantı.").max(512, "Geçersiz bağlantı.");
/** Checkbox values arrive as "on" or are absent. */
const checkbox = z.string().optional();

export const loginSchema = z.object({
  kind,
  local,
  password: z.string({ error: "Şifrenizi girin." }).min(1, "Şifrenizi girin.").max(256, "Şifre çok uzun."),
  remember: checkbox,
  next: z.string().max(2048).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({ local: studentNo });
export type RegisterInput = z.infer<typeof registerSchema>;

export const resendVerificationSchema = registerSchema;

export const forgotPasswordSchema = z.object({ kind, local });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const completeRegistrationSchema = z
  .object({
    token,
    password: passwordSchema,
    confirmPassword: z.string({ error: "Şifreyi tekrar girin." }),
    kvkk: z.literal("on", { error: "Devam etmek için aydınlatma metnini onaylayın." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor. Aynı şifreyi iki kez yazın.",
  });
export type CompleteRegistrationInput = z.infer<typeof completeRegistrationSchema>;

export const resetPasswordSchema = newPasswordSchema.safeExtend({ token });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = newPasswordSchema.safeExtend({
  currentPassword: z.string({ error: "Mevcut şifrenizi girin." }).min(1, "Mevcut şifrenizi girin.").max(256),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
