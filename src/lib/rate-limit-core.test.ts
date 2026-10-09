import { describe, expect, it } from "vitest";

import { decideRateLimit, formatRetryAfter, peekRateLimit, type RateLimitWindow } from "./rate-limit-core";

const t0 = new Date("2026-10-09T10:00:00Z");
const at = (sec: number) => new Date(t0.getTime() + sec * 1000);

/** Ardışık istekleri simüle eder. */
function run(times: number[], limit: number, windowSec: number) {
  let state: RateLimitWindow | null = null;
  return times.map((sec) => {
    const d = decideRateLimit(state, at(sec), limit, windowSec);
    state = d.next;
    return d;
  });
}

describe("decideRateLimit (sabit pencere)", () => {
  it("limit kadar isteğe izin verir, sonrasını engeller", () => {
    const results = run([0, 1, 2, 3], 3, 3600);
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("engellenince pencere sonuna kadar kalan süreyi bildirir", () => {
    const results = run([0, 10, 20, 30], 3, 3600);
    expect(results[3]!.retryAfter).toBe(3600 - 30);
  });

  it("pencere dolunca sayaç sıfırlanır", () => {
    const results = run([0, 1, 2, 3, 3600, 3601], 3, 3600);
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, true, true]);
    expect(results[4]!.next.windowStart).toEqual(at(3600));
  });

  it("engellenen istekler pencereyi uzatmaz ve sayacı şişirmez", () => {
    const results = run([0, 1, 2, 3, 4, 5, 6], 2, 60);
    expect(results.at(-1)!.next.count).toBe(3);
    expect(results.at(-1)!.next.windowStart).toEqual(t0);
  });

  it("60 sn'de bir (tekrar gönder) politikası", () => {
    const results = run([0, 30, 59, 60], 1, 60);
    expect(results.map((r) => r.ok)).toEqual([true, false, false, true]);
    expect(results[1]!.retryAfter).toBe(30);
    expect(results[2]!.retryAfter).toBe(1);
  });

  it("saat geri kayarsa yeni pencere başlatır", () => {
    const d = decideRateLimit({ count: 5, windowStart: at(100) }, at(50), 5, 60);
    expect(d.ok).toBe(true);
    expect(d.next).toEqual({ count: 1, windowStart: at(50) });
  });

  it("geçersiz parametreleri reddeder", () => {
    expect(() => decideRateLimit(null, t0, 0, 60)).toThrow();
    expect(() => decideRateLimit(null, t0, 1.5, 60)).toThrow();
    expect(() => decideRateLimit(null, t0, 1, 0)).toThrow();
  });
});

describe("peekRateLimit", () => {
  it("saymadan kilit durumunu söyler", () => {
    expect(peekRateLimit(null, t0, 5, 900)).toEqual({ limited: false, retryAfter: 0, count: 0 });
    expect(peekRateLimit({ count: 4, windowStart: t0 }, at(10), 5, 900).limited).toBe(false);
    expect(peekRateLimit({ count: 5, windowStart: t0 }, at(10), 5, 900)).toEqual({ limited: true, retryAfter: 890, count: 5 });
    expect(peekRateLimit({ count: 5, windowStart: t0 }, at(900), 5, 900).limited).toBe(false);
  });
});

describe("formatRetryAfter", () => {
  it("Türkçe süre metni", () => {
    expect(formatRetryAfter(0)).toBe("1 saniye");
    expect(formatRetryAfter(45)).toBe("45 saniye");
    expect(formatRetryAfter(61)).toBe("2 dakika");
    expect(formatRetryAfter(900)).toBe("15 dakika");
    expect(formatRetryAfter(3540)).toBe("59 dakika");
    expect(formatRetryAfter(3600)).toBe("1 saat");
    expect(formatRetryAfter(3601)).toBe("2 saat");
  });
});
