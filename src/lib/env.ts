import "server-only";

import { z } from "zod";

/**
 * Sunucu ortam değişkenleri — tek doğrulama noktası.
 *
 * - Değerler İLK ERİŞİMDE doğrulanır (lazy). Böylece `next build` sırasında gizli anahtarlar
 *   olmadan derleme yapılabilir; eksik/yanlış değer çalışma zamanında, ilk kullanımda,
 *   açıklayıcı bir hatayla patlar.
 * - `process.env.X` doğrudan OKUNMAZ; her zaman `env.X` kullanılır.
 * - İstemciye gereken değerler (ör. TURNSTILE_SITE_KEY) NEXT_PUBLIC_ ile gömülmez;
 *   sunucu bileşeni prop olarak geçirir. Böylece aynı imaj farklı ortamlarda çalışır.
 */

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

/** Boş string'i "tanımsız" kabul eder (.env dosyalarındaki `KEY=` satırları için). */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const base64Key32 = z
  .string()
  .min(1, "zorunlu")
  .refine((v) => Buffer.from(v, "base64").length === 32, {
    message: "base64 kodlu tam 32 byte olmalı (üretmek için: openssl rand -base64 32)",
  });

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "postgres:// ile başlayan bir bağlantı adresi olmalı" }),
  APP_URL: z.url({ protocol: /^https?$/ }).transform((v) => v.replace(/\/+$/, "")),

  SESSION_SECRET: z.string().min(32, "en az 32 karakter olmalı"),
  DATA_ENCRYPTION_KEY: base64Key32,
  BLIND_INDEX_KEY: base64Key32,

  RESEND_API_KEY: optionalString,
  MAIL_FROM: z.string().min(3).default("Kodbox <no-reply@kodbox.local>"),

  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  FEATURE_APPLE_LOGIN: bool,
  APPLE_CLIENT_ID: optionalString,
  APPLE_TEAM_ID: optionalString,
  APPLE_KEY_ID: optionalString,
  APPLE_PRIVATE_KEY: optionalString,

  CRON_SECRET: optionalString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

function load(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(kök)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Ortam değişkenleri geçersiz. .env.local dosyasını .env.example ile karşılaştırın:\n${details}`,
    );
  }
  const value = parsed.data;
  if (value.FEATURE_APPLE_LOGIN) {
    const missing = (["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"] as const).filter(
      (k) => !value[k],
    );
    if (missing.length > 0) {
      throw new Error(`FEATURE_APPLE_LOGIN=true ama şu değişkenler eksik: ${missing.join(", ")}`);
    }
  }
  cached = value;
  return value;
}

/**
 * Doğrulanmış ortam değişkenleri. Erişim anında tüm şema bir kez doğrulanır.
 * @example env.DATABASE_URL
 */
export const env: Readonly<ServerEnv> = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return load()[prop as keyof ServerEnv];
  },
  has(_target, prop: string) {
    return prop in load();
  },
  ownKeys() {
    return Reflect.ownKeys(load());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return { enumerable: true, configurable: true, value: load()[prop as keyof ServerEnv] };
  },
});

export const isProduction = () => env.NODE_ENV === "production";

/** Google ile giriş yapılandırılmış mı? (Buton görünürlüğü için) */
export const isGoogleLoginEnabled = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** Apple ile giriş açık mı? (FEATURE_APPLE_LOGIN bayrağı + anahtarlar) */
export const isAppleLoginEnabled = () => env.FEATURE_APPLE_LOGIN;

/** Testlerde önbelleği sıfırlamak için. */
export function __resetEnvCacheForTests() {
  cached = undefined;
}
