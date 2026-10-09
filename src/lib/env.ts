import "server-only";

import { z } from "zod";

/**
 * Server environment variables: single validation point.
 *
 * - Validated lazily on first access, so `next build` works without secrets; missing or
 *   invalid values fail at runtime with a descriptive error.
 * - Never read `process.env.X` directly, always use `env.X`.
 * - Values needed by the client are passed from server components as props.
 */

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

/** Treats empty strings as undefined (`KEY=` lines in .env files). */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const base64Key32 = z
  .string()
  .min(1, "required")
  .refine((v) => Buffer.from(v, "base64").length === 32, {
    message: "must be base64 encoded, exactly 32 bytes (generate: openssl rand -base64 32)",
  });

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// connection URL" }),
  APP_URL: z.url({ protocol: /^https?$/ }).transform((v) => v.replace(/\/+$/, "")),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Kodbox Campus"),

  SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
  DATA_ENCRYPTION_KEY: base64Key32,
  BLIND_INDEX_KEY: base64Key32,

  RESEND_API_KEY: optionalString,
  MAIL_FROM: z.string().min(3).default("Kodbox Campus <no-reply@kodbox.local>"),

  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  /** Skips the Turnstile server check. Refused in production. */
  TURNSTILE_DEV_BYPASS: bool,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  /** Web push (F6). Generate with `npx web-push generate-vapid-keys`. */
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: optionalString,

  CRON_SECRET: optionalString,

  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

/** Validates a raw environment object. Exported for tests; the app uses `env`. */
export function parseEnv(raw: Record<string, string | undefined>): ServerEnv {
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables. Compare your .env with .env.example:\n${details}`);
  }
  const value = parsed.data;
  if (value.NODE_ENV === "production" && value.TURNSTILE_DEV_BYPASS) {
    throw new Error("TURNSTILE_DEV_BYPASS cannot be enabled in production.");
  }
  if (value.VAPID_PUBLIC_KEY && !value.VAPID_PRIVATE_KEY) {
    throw new Error("VAPID_PUBLIC_KEY is set but VAPID_PRIVATE_KEY is missing.");
  }
  return value;
}

let cached: ServerEnv | undefined;

function load(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

/**
 * Validated environment variables. The whole schema is validated once on first access.
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

export const isGoogleLoginEnabled = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const isPushConfigured = () => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/** For tests: clears the cached parse result. */
export function __resetEnvCacheForTests() {
  cached = undefined;
}
