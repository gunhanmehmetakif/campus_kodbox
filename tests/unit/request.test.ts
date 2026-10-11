import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let current = new Headers();
vi.mock("next/headers", () => ({ headers: async () => current }));

import { isCloudflareIp } from "@/lib/ip";
import { getClientIp } from "@/lib/server/request";

describe("isCloudflareIp", () => {
  it("matches IPv4, IPv6 and IPv4-mapped addresses in the published ranges", () => {
    expect(isCloudflareIp("173.245.48.1")).toBe(true);
    expect(isCloudflareIp("104.16.0.1")).toBe(true);
    expect(isCloudflareIp("2606:4700::1")).toBe(true);
    expect(isCloudflareIp("::ffff:162.158.1.1")).toBe(true);
  });

  it("rejects other addresses and garbage", () => {
    expect(isCloudflareIp("198.51.100.4")).toBe(false);
    expect(isCloudflareIp("2001:db8::1")).toBe(false);
    expect(isCloudflareIp("not-an-ip")).toBe(false);
    expect(isCloudflareIp("")).toBe(false);
  });
});

describe("getClientIp", () => {
  beforeEach(() => {
    current = new Headers();
  });

  it("honors cf-connecting-ip when the peer is a Cloudflare IP", async () => {
    current = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-real-ip": "172.64.1.1",
      "x-forwarded-for": "1.1.1.1, 172.64.1.1",
    });
    expect(await getClientIp()).toBe("203.0.113.7");
  });

  it("honors cf-connecting-ip for an IPv6 Cloudflare peer", async () => {
    current = new Headers({ "cf-connecting-ip": "203.0.113.8", "x-real-ip": "2606:4700:10::1" });
    expect(await getClientIp()).toBe("203.0.113.8");
  });

  it("ignores cf-connecting-ip when the peer is not Cloudflare", async () => {
    current = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-real-ip": "198.51.100.4" });
    expect(await getClientIp()).toBe("198.51.100.4");
  });

  it("uses the peer when there is no cf-connecting-ip", async () => {
    current = new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1, 172.18.0.2" });
    expect(await getClientIp()).toBe("198.51.100.4");
  });

  it("ignores a spoofed first x-forwarded-for value and uses the last one", async () => {
    current = new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.9" });
    expect(await getClientIp()).toBe("198.51.100.9");
  });

  it("uses the last x-forwarded-for entry as the Cloudflare peer check", async () => {
    current = new Headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6, 104.17.0.5" });
    expect(await getClientIp()).toBe("203.0.113.9");
  });

  it("falls back to unknown", async () => {
    expect(await getClientIp()).toBe("unknown");
  });
});
