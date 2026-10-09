/**
 * Sabit pencere (fixed window) rate limit algoritması — saf fonksiyon.
 * DB uygulaması: src/lib/server/rate-limit.ts (bu fonksiyonu satır kilidiyle kullanır).
 */

export type RateLimitWindow = { count: number; windowStart: Date };

export type RateLimitDecision = {
  /** İstek izinli mi? */
  ok: boolean;
  /** Bu pencerede kalan hak (izinliyse). */
  remaining: number;
  /** Engellendiyse kaç saniye sonra tekrar denenebilir; izinliyse 0. */
  retryAfter: number;
  /** Kaydedilecek yeni durum. */
  next: RateLimitWindow;
};

function isExpired(prev: RateLimitWindow | null, now: Date, windowMs: number): prev is null {
  return !prev || now.getTime() - prev.windowStart.getTime() >= windowMs || now < prev.windowStart;
}

function secondsUntilWindowEnd(windowStart: Date, now: Date, windowMs: number): number {
  return Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000));
}

/**
 * Bir isteği sayar ve karar verir.
 * - Önceki pencere yoksa, süresi dolduysa (veya saat geri kaydıysa) yeni pencere `now` ile başlar.
 * - Sayaç `limit + 1`'de doyar: engellenen istekler sayacı şişirmez ve pencereyi uzatmaz.
 */
export function decideRateLimit(
  prev: RateLimitWindow | null,
  now: Date,
  limit: number,
  windowSec: number,
): RateLimitDecision {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit pozitif tam sayı olmalı");
  if (!(windowSec > 0)) throw new Error("windowSec pozitif olmalı");

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

/** Saymadan mevcut durumu değerlendirir (ör. "hesap kilitli mi?" kontrolü). */
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

/** Bekleme süresini Türkçe metne çevirir: "45 saniye", "3 dakika", "2 saat". */
export function formatRetryAfter(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} saniye`;
  const minutes = Math.ceil(s / 60);
  if (minutes < 60) return `${minutes} dakika`;
  return `${Math.ceil(minutes / 60)} saat`;
}
