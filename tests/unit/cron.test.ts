import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/notifications/reminders", () => ({
  runDueReminders: vi.fn(async () => ({ assignments: 1, students: 2 })),
  runCleanup: vi.fn(async () => ({ rateLimits: 0, sessions: 0, notifications: 0 })),
}));

import { POST } from "@/app/api/cron/saatlik/route";
import { __resetEnvCacheForTests } from "@/lib/env";

const call = (authorization?: string) =>
  POST(
    new Request("http://localhost/api/cron/saatlik", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

describe("POST /api/cron/saatlik", () => {
  beforeEach(() => __resetEnvCacheForTests());
  afterEach(() => {
    delete process.env.CRON_SECRET;
    __resetEnvCacheForTests();
  });

  it("returns 404 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer anything")).status).toBe(404);
  });

  it("returns 401 for a missing or wrong secret", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect((await call("test-cron-secret")).status).toBe(401);
  });

  it("runs the jobs with the right secret", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = await call("Bearer test-cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reminders: { assignments: 1, students: 2 },
      cleanup: { rateLimits: 0, sessions: 0, notifications: 0 },
    });
  });
});
