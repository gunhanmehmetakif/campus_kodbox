import "server-only";

import { eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { decideRateLimit, peekRateLimit } from "@/lib/rate-limit-core";

export { formatRetryAfter } from "@/lib/rate-limit-core";

/**
 * DB tabanlı sabit pencere rate limit (PLAN.md §2.4).
 *
 * @example
 *   const rl = await consume(rateLimitKey("auth-ip", ip), RATE_LIMITS.authRequestPerIp);
 *   if (!rl.ok) return fail(`Çok fazla deneme yaptın. ${formatRetryAfter(rl.retryAfter)} sonra tekrar dene.`);
 */

export type RateLimitPolicy = { limit: number; windowSec: number };
export type RateLimitResult = { ok: boolean; remaining: number; retryAfter: number };

/** PLAN.md'deki politikalar. Yeni bir sınır gerekiyorsa buraya ekleyin. */
export const RATE_LIMITS = {
  /** Aynı kimliğe (öğrenci no / personel maili) en fazla 3 mail / saat. */
  mailPerIdentity: { limit: 3, windowSec: 60 * 60 },
  /** Aynı IP'den en fazla 10 kayıt veya sıfırlama isteği / saat. */
  authRequestPerIp: { limit: 10, windowSec: 60 * 60 },
  /** Aynı hesaba 5 başarısız giriş → pencere sonuna kadar (en fazla 15 dk) bekleme. */
  loginFailures: { limit: 5, windowSec: 15 * 60 },
  /** Aynı IP'den giriş denemesi (hesap tarama / kaba kuvvete karşı). */
  loginPerIp: { limit: 30, windowSec: 15 * 60 },
  /** "Tekrar gönder" butonu: 60 saniyede bir. */
  resendCooldown: { limit: 1, windowSec: 60 },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * Anahtar üretir; parçalar ":" ile birleşir. KİŞİSEL VERİ YAZMAYIN: mail/numara yerine
 * blindIndex(...) kullanın. IP adresi geçici sayaç anahtarında kabul edilebilir.
 * @example rateLimitKey("login-fail", emailHash) // "login-fail:ab12…"
 */
export function rateLimitKey(scope: string, ...parts: string[]): string {
  return [scope, ...parts].join(":");
}

/**
 * Bir isteği sayar ve karar döner. Satır kilidiyle (SELECT … FOR UPDATE) eşzamanlı
 * isteklerde de doğru sayar.
 */
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

/** Saymadan kontrol eder (ör. şifre doğrulamadan önce "hesap kilitli mi?"). */
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

/** Sayacı sıfırlar (ör. başarılı girişten sonra başarısız giriş sayacı). */
export async function resetRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Süresi dolmuş sayaçları siler (F6 cron'u çağırır). Silinen satır sayısını döner. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const rows = await db
    .delete(rateLimits)
    .where(lt(rateLimits.expiresAt, new Date()))
    .returning({ key: rateLimits.key });
  return rows.length;
}
