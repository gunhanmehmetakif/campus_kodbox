import "server-only";

import { eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { decideRateLimit, peekRateLimit } from "@/lib/rate-limit-core";

export { formatRetryAfter } from "@/lib/rate-limit-core";

/**
 * DB backed fixed-window rate limit (docs/PRD.md section 2.5).
 *
 * @example
 *   const rl = await consume(rateLimitKey("auth-ip", ip), RATE_LIMITS.authRequestPerIp);
 *   if (!rl.ok) return fail(`Çok fazla deneme yaptın. ${formatRetryAfter(rl.retryAfter)} sonra tekrar dene.`);
 */

export type RateLimitPolicy = { limit: number; windowSec: number };
export type RateLimitResult = { ok: boolean; remaining: number; retryAfter: number };

export const RATE_LIMITS = {
  /** At most 3 mails per hour for the same identity (student no / staff email). */
  mailPerIdentity: { limit: 3, windowSec: 60 * 60 },
  /** At most 10 register or reset requests per hour from the same IP. */
  authRequestPerIp: { limit: 10, windowSec: 60 * 60 },
  /** 5 failed logins on the same account lock it for the rest of a 15 minute window. */
  loginFailures: { limit: 5, windowSec: 15 * 60 },
  /** Login attempts per IP (account scanning / brute force). */
  loginPerIp: { limit: 30, windowSec: 15 * 60 },
  /** "Resend" button: once per 60 seconds. */
  resendCooldown: { limit: 1, windowSec: 60 },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * Builds a key by joining parts with ":". Do not put personal data in it: use blindIndex(...)
 * instead of emails or numbers. An IP address is acceptable in a short-lived counter key.
 */
export function rateLimitKey(scope: string, ...parts: string[]): string {
  return [scope, ...parts].join(":");
}

/** Counts one request and decides. Uses SELECT ... FOR UPDATE so concurrent requests count correctly. */
export async function consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
export async function consume(key: string, limit: number, windowSec: number): Promise<RateLimitResult>;
export async function consume(
  key: string,
  policyOrLimit: RateLimitPolicy | number,
  maybeWindowSec?: number,
): Promise<RateLimitResult> {
  const { limit, windowSec } =
    typeof policyOrLimit === "number" ? { limit: policyOrLimit, windowSec: maybeWindowSec ?? 0 } : policyOrLimit;
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .insert(rateLimits)
      .values({ key, windowStart: now, count: 0, expiresAt: new Date(now.getTime() + windowSec * 1000) })
      .onConflictDoNothing({ target: rateLimits.key });

    const [row] = await tx.select().from(rateLimits).where(eq(rateLimits.key, key)).for("update");
    const decision = decideRateLimit(
      row ? { count: row.count, windowStart: row.windowStart } : null,
      now,
      limit,
      windowSec,
    );

    await tx
      .update(rateLimits)
      .set({
        count: decision.next.count,
        windowStart: decision.next.windowStart,
        expiresAt: new Date(decision.next.windowStart.getTime() + windowSec * 1000),
      })
      .where(eq(rateLimits.key, key));

    return { ok: decision.ok, remaining: decision.remaining, retryAfter: decision.retryAfter };
  });
}

/** Checks without counting (e.g. "is the account locked?" before verifying the password). */
export async function peek(
  key: string,
  policy: RateLimitPolicy,
): Promise<{ limited: boolean; retryAfter: number; count: number }> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  return peekRateLimit(
    row ? { count: row.count, windowStart: row.windowStart } : null,
    new Date(),
    policy.limit,
    policy.windowSec,
  );
}

/** Resets a counter (e.g. failed-login counter after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Purges expired counters (F6 cron). Returns the number of deleted rows. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const rows = await db
    .delete(rateLimits)
    .where(lt(rateLimits.expiresAt, new Date()))
    .returning({ key: rateLimits.key });
  return rows.length;
}
