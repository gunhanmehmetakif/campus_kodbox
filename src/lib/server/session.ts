import "server-only";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

import { generateToken, sha256Hex } from "./crypto";

/**
 * Veritabanı tabanlı oturumlar (Lucia rehberindeki desen).
 *
 * - Giriş anında 256 bit rastgele token üretilir; ÇEREZDE token, DB'de SHA-256(token) tutulur.
 *   DB sızsa bile çalınan hash'lerle oturum açılamaz.
 * - Ömür 30 gün, kayan: kalan süre 15 günün altına düştüğünde DB'de 30 güne uzatılır;
 *   çerezin ömrü ise her sayfa isteğinde src/proxy.ts tarafından yenilenir.
 * - Çerez: httpOnly, sameSite=lax, canlıda secure + `__Host-` öneki.
 *
 * Çerez YAZMA/SİLME (createSession, deleteSessionCookie) sadece Server Action veya
 * Route Handler içinde çağrılabilir; Server Component render'ında çağrılamaz.
 */

export type SessionUser = Pick<
  User,
  | "id"
  | "role"
  | "schoolId"
  | "emailEnc"
  | "studentNoEnc"
  | "displayName"
  | "status"
  | "mustChangePassword"
  | "theme"
>;

export type ValidatedSession = {
  session: { id: string; userId: string; expiresAt: Date };
  user: SessionUser;
};

/** User-Agent'ı makul uzunlukta tutar (kişisel veri değil, ama sınırsız saklamayalım). */
function shortUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  return ua.slice(0, 255);
}

/**
 * Yeni oturum oluşturur ve çerezi yazar. Giriş başarılı olduktan sonra çağırın.
 * Oturum sabitleme (session fixation) riskine karşı her girişte yeni token üretilir.
 * @returns ham token (normalde ihtiyaç yoktur; testler için)
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const ua = (await headers()).get("user-agent");

  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    expiresAt,
    userAgent: shortUserAgent(ua),
  });

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { token, expiresAt };
}

/**
 * Token'ı doğrular (çerez okumaz; saf DB işlemi). Süresi dolmuşsa siler.
 * Kullanıcı devre dışıysa oturum geçersiz sayılır.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const sessionId = sha256Hex(token);
  const rows = await db
    .select({
      session: { id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt },
      user: {
        id: users.id,
        role: users.role,
        schoolId: users.schoolId,
        emailEnc: users.emailEnc,
        studentNoEnc: users.studentNoEnc,
        displayName: users.displayName,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        theme: users.theme,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  if (row.user.status === "disabled") {
    await db.delete(sessions).where(eq(sessions.userId, row.user.id));
    return null;
  }

  // Kayan süre: yarısı geçtiyse 30 güne uzat.
  if (row.session.expiresAt.getTime() - now < SESSION_REFRESH_THRESHOLD_SECONDS * 1000) {
    const expiresAt = new Date(now + SESSION_MAX_AGE_SECONDS * 1000);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date(now) }).where(eq(sessions.id, sessionId));
    row.session.expiresAt = expiresAt;
  }

  return row;
}

/**
 * İstekteki oturum çerezini doğrular. React `cache` sayesinde aynı istekte kaç kez
 * çağrılırsa çağrılsın DB'ye tek sorgu gider.
 *
 * Request-time API'dir (cookies). Cache Components açık olduğundan çağıran bileşen bir
 * <Suspense> sınırı (veya loading.tsx) altında olmalıdır.
 */
export const validateSession = cache(async (): Promise<ValidatedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** Tek bir oturumu sonlandırır (çıkış). Çerezi de siler. Server Action / Route Handler içinde. */
export async function invalidateSession(sessionId?: string): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const id = sessionId ?? (token ? sha256Hex(token) : null);
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  deleteSessionCookie(store);
}

/**
 * Kullanıcının TÜM oturumlarını sonlandırır (şifre değişimi/sıfırlama, hesabın devre dışı
 * bırakılması). `exceptSessionId` verilirse o oturum korunur (şifresini değiştiren cihaz).
 */
export async function invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  if (exceptSessionId) {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}

/** Oturum çerezini siler. */
export function deleteSessionCookie(store: Awaited<ReturnType<typeof cookies>>) {
  store.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** Süresi dolmuş oturumları temizler (F6 cron'u çağırır). Silinen satır sayısını döner. */
export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return deleted.length;
}

/** Kullanıcının aktif oturumları (ayarlar ekranındaki "oturumlar" listesi için). */
export async function listUserSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(sessions.lastSeenAt);
}
