import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

const base = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://u:p@localhost:5433/db",
  APP_URL: "http://localhost:3000/",
  SESSION_SECRET: "x".repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  BLIND_INDEX_KEY: Buffer.alloc(32, 2).toString("base64"),
  TURNSTILE_SITE_KEY: "site",
  TURNSTILE_SECRET_KEY: "secret",
};

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    const env = parseEnv(base);
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Kodbox Campus");
    expect(env.TURNSTILE_DEV_BYPASS).toBe(false);
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("treats empty optional values as undefined", () => {
    expect(parseEnv({ ...base, RESEND_API_KEY: "", GOOGLE_CLIENT_ID: "  " }).RESEND_API_KEY).toBeUndefined();
  });

  it("lists every invalid variable", () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: "short", DATA_ENCRYPTION_KEY: "abc" })).toThrow(
      /SESSION_SECRET[\s\S]*DATA_ENCRYPTION_KEY/,
    );
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    void _omit;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("refuses the Turnstile bypass in production", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production", TURNSTILE_DEV_BYPASS: "true" })).toThrow(/production/);
    expect(parseEnv({ ...base, TURNSTILE_DEV_BYPASS: "true" }).TURNSTILE_DEV_BYPASS).toBe(true);
  });

  it("requires the VAPID private key when the public key is set", () => {
    expect(() => parseEnv({ ...base, VAPID_PUBLIC_KEY: "pub" })).toThrow(/VAPID/);
  });
});
