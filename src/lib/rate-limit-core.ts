/**
 * Fixed-window rate limit algorithm (pure).
 * DB implementation: src/lib/server/rate-limit.ts (applies this under a row lock).
 */

export type RateLimitWindow = { count: number; windowStart: Date };

export type RateLimitDecision = {
  ok: boolean;
  /** Remaining allowance in this window (when ok). */
  remaining: number;
  /** Seconds until retry is possible when blocked; 0 when ok. */
  retryAfter: number;
  /** State to persist. */
  next: RateLimitWindow;
};

function isExpired(prev: RateLimitWindow | null, now: Date, windowMs: number): prev is null {
  return !prev || now.getTime() - prev.windowStart.getTime() >= windowMs || now < prev.windowStart;
}

function secondsUntilWindowEnd(windowStart: Date, now: Date, windowMs: number): number {
  return Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000));
}

/**
 * Counts one request and decides. A new window starts when none exists, the old one expired,
 * or the clock moved backwards. The counter saturates at `limit + 1` so blocked requests do
 * not inflate it or extend the window.
 */
export function decideRateLimit(
  prev: RateLimitWindow | null,
  now: Date,
  limit: number,
  windowSec: number,
): RateLimitDecision {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a positive integer");
  if (!(windowSec > 0)) throw new Error("windowSec must be positive");

  const windowMs = windowSec * 1000;
  const expired = isExpired(prev, now, windowMs);
  const windowStart = expired ? now : prev!.windowStart;
  const count = Math.min((expired ? 0 : prev!.count) + 1, limit + 1);
  const ok = count <= limit;

  return {
    ok,
    remaining: ok ? limit - count : 0,
    retryAfter: ok ? 0 : secondsUntilWindowEnd(windowStart, now, windowMs),
    next: { count, windowStart },
  };
}

/** Evaluates the current state without counting (e.g. "is the account locked?"). */
export function peekRateLimit(
  prev: RateLimitWindow | null,
  now: Date,
  limit: number,
  windowSec: number,
): { limited: boolean; retryAfter: number; count: number } {
  const windowMs = windowSec * 1000;
  if (isExpired(prev, now, windowMs)) return { limited: false, retryAfter: 0, count: 0 };
  const limited = prev!.count >= limit;
  return {
    limited,
    retryAfter: limited ? secondsUntilWindowEnd(prev!.windowStart, now, windowMs) : 0,
    count: prev!.count,
  };
}

/** Turkish wait text: "45 saniye", "3 dakika", "2 saat". */
export function formatRetryAfter(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} saniye`;
  const minutes = Math.ceil(s / 60);
  if (minutes < 60) return `${minutes} dakika`;
  return `${Math.ceil(minutes / 60)} saat`;
}
