import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let current = new Headers();
vi.mock("next/headers", () => ({ headers: async () => current }));

import { getClientIp } from "@/lib/server/request";

describe("getClientIp", () => {
  beforeEach(() => {
    current = new Headers();
  });

  it("cf-connecting-ip wins over every other header", async () => {
    current = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-real-ip": "10.0.0.1",
      "x-forwarded-for": "1.1.1.1, 172.18.0.2",
    });
    expect(await getClientIp()).toBe("203.0.113.7");
  });

  it("uses x-real-ip when there is no cf-connecting-ip", async () => {
    current = new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1, 172.18.0.2" });
    expect(await getClientIp()).toBe("198.51.100.4");
  });

  it("ignores a spoofed first x-forwarded-for value and uses the last one", async () => {
    current = new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.9" });
    expect(await getClientIp()).toBe("198.51.100.9");
  });

  it("falls back to unknown", async () => {
    expect(await getClientIp()).toBe("unknown");
  });
});
