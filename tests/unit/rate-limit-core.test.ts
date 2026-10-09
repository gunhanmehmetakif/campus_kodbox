import { describe, expect, it } from "vitest";

import { decideRateLimit, formatRetryAfter, peekRateLimit } from "@/lib/rate-limit-core";

const t0 = new Date("2026-10-09T10:00:00Z");
const after = (s: number) => new Date(t0.getTime() + s * 1000);

describe("decideRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    let state = null as ReturnType<typeof decideRateLimit>["next"] | null;
    const oks: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const d = decideRateLimit(state, after(i), 3, 60);
      oks.push(d.ok);
      state = d.next;
    }
    expect(oks).toEqual([true, true, true, false]);
  });

  it("does not inflate the counter or extend the window while blocked", () => {
    let state = decideRateLimit(null, t0, 1, 60).next;
    for (let i = 1; i < 10; i++) state = decideRateLimit(state, after(i), 1, 60).next;
    expect(state.count).toBe(2);
    expect(state.windowStart).toEqual(t0);
  });

  it("starts a new window after expiry", () => {
    const first = decideRateLimit(null, t0, 1, 60).next;
    expect(decideRateLimit(first, after(61), 1, 60).ok).toBe(true);
  });

  it("reports retryAfter", () => {
    const first = decideRateLimit(null, t0, 1, 60).next;
    expect(decideRateLimit(first, after(20), 1, 60).retryAfter).toBe(40);
  });
});

describe("peekRateLimit / formatRetryAfter", () => {
  it("peek does not count", () => {
    const state = decideRateLimit(null, t0, 2, 60).next;
    expect(peekRateLimit(state, after(1), 2, 60)).toMatchObject({ limited: false, count: 1 });
  });

  it("formats Turkish wait text", () => {
    expect(formatRetryAfter(30)).toBe("30 saniye");
    expect(formatRetryAfter(150)).toBe("3 dakika");
    expect(formatRetryAfter(7200)).toBe("2 saat");
  });
});
