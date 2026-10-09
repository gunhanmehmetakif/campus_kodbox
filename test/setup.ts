/**
 * Vitest ortamı: deterministik test anahtarları + (varsa) ayrı test veritabanı.
 * Next, NODE_ENV=test iken .env.local'i OKUMAZ; .env.test / .env.test.local ve ortam değişkenleri geçerlidir.
 * TEST_DATABASE_URL yoksa yerel docker'daki kodbox_test kullanılır (erişilemezse DB testleri atlanır).
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const testDb = process.env.TEST_DATABASE_URL;

Object.assign(process.env, {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: testDb || "postgres://kodbox:kodbox@localhost:5433/kodbox_test",
  SESSION_SECRET: "test-session-secret-test-session-secret-0123456789",
  // 32 byte'lık sabit test anahtarları (base64)
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  BLIND_INDEX_KEY: Buffer.alloc(32, 9).toString("base64"),
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  RESEND_API_KEY: "",
});
