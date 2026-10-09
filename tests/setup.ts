/**
 * Vitest environment: deterministic test keys and a separate test database.
 * Falls back to the local docker kodbox_test database when TEST_DATABASE_URL is unset.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const testDb = process.env.TEST_DATABASE_URL;

Object.assign(process.env, {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: testDb || "postgres://kodbox:kodbox@localhost:5433/kodbox_test",
  SESSION_SECRET: "test-session-secret-test-session-secret-0123456789",
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  BLIND_INDEX_KEY: Buffer.alloc(32, 9).toString("base64"),
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  TURNSTILE_DEV_BYPASS: "false",
  RESEND_API_KEY: "",
});
