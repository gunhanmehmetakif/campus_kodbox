import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Repository root (this file lives in tests/e2e/support). */
export const ROOT = path.resolve(__dirname, "../../..");

/** Parses a minimal KEY=VALUE env file; a missing file means no overrides. */
function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) out[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = readEnvFile(path.join(ROOT, ".env.e2e"));
const pick = (key: string, fallback: string) => process.env[key] ?? fileEnv[key] ?? fallback;

export const E2E_PORT = Number(pick("E2E_PORT", "3100"));
export const E2E_DATABASE_URL = pick("E2E_DATABASE_URL", "postgres://kodbox:kodbox@localhost:5433/kodbox_e2e");
export const BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Random per run. Assigned into process.env while the config loads in the main process, so the
 * worker processes (forked later) inherit the same value.
 */
export const CRON_SECRET = (process.env.E2E_CRON_SECRET ??= randomBytes(24).toString("base64url"));

/** Fake, public keys: the e2e database is throwaway and these never meet real data. */
const fakeKey = (fill: string) => Buffer.alloc(32, fill).toString("base64");

/** Environment of the e2e dev server and of the seed script. Points the app at the e2e database only. */
export function serverEnv(): Record<string, string> {
  return {
    NODE_ENV: "development",
    DATABASE_URL: E2E_DATABASE_URL,
    APP_URL: BASE_URL,
    NEXT_PUBLIC_APP_NAME: "Kodbox Campus",
    SESSION_SECRET: "e2e-session-secret-not-for-production-use-0000",
    DATA_ENCRYPTION_KEY: fakeKey("d"),
    BLIND_INDEX_KEY: fakeKey("b"),
    // Empty: mail goes to .dev-mail/, Google and push stay off regardless of the developer's .env.
    RESEND_API_KEY: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    VAPID_PUBLIC_KEY: "",
    VAPID_PRIVATE_KEY: "",
    TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    TURNSTILE_DEV_BYPASS: "true",
    CRON_SECRET,
    NEXT_TELEMETRY_DISABLED: "1",
    // Lets a second dev server run next to the regular one (own lock + cache) once next.config.ts honors it.
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-e2e",
  };
}

/** Mobile flows: `test.use(MOBILE)` at the top of the spec file. */
export const MOBILE = {
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
} as const;
