import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const envMock = vi.hoisted(() => ({
  NODE_ENV: "production",
  APP_URL: "https://campus.example.test",
  TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "secret-key",
  TURNSTILE_DEV_BYPASS: false,
}));
vi.mock("@/lib/env", () => ({ env: envMock }));

import { getTurnstileSiteKey, verifyTurnstile } from "@/lib/server/turnstile";

function mockSiteverify(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  );
}

describe("verifyTurnstile", () => {
  beforeEach(() => {
    envMock.NODE_ENV = "production";
    envMock.TURNSTILE_DEV_BYPASS = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts a matching hostname in production", async () => {
    mockSiteverify({ success: true, hostname: "campus.example.test" });
    expect(await verifyTurnstile("token")).toEqual({ ok: true });
  });

  it("rejects a different hostname in production", async () => {
    mockSiteverify({ success: true, hostname: "evil.example.test" });
    expect(await verifyTurnstile("token")).toEqual({ ok: false, errorCodes: ["hostname-mismatch"] });
  });

  it("does not check the hostname outside production", async () => {
    envMock.NODE_ENV = "development";
    mockSiteverify({ success: true, hostname: "localhost" });
    expect(await verifyTurnstile("token")).toEqual({ ok: true });
  });

  it("passes Cloudflare's error codes through", async () => {
    mockSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile("token")).toEqual({ ok: false, errorCodes: ["invalid-input-response"] });
  });
});

describe("getTurnstileSiteKey", () => {
  it("returns an empty key in dev bypass so no widget renders", () => {
    envMock.TURNSTILE_DEV_BYPASS = true;
    expect(getTurnstileSiteKey()).toBe("");
    envMock.TURNSTILE_DEV_BYPASS = false;
    expect(getTurnstileSiteKey()).toBe("site-key");
  });
});
