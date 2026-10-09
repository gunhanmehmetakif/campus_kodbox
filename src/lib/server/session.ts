import "server-only";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import {
  REMEMBER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  SHORT_SESSION_MAX_AGE_SECONDS,
  SHORT_SESSION_REFRESH_THRESHOLD_SECONDS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

import { generateToken, sha256Hex } from "./crypto";

/**
 * Database sessions.
 *
 * - The cookie holds a random 256-bit token; the DB holds SHA-256(token), so a DB leak does
 *   not allow session takeover.
 * - "Remember me": 90 days, sliding (extended in the DB once less than 45 days remain; the
 *   cookie lifetime is renewed by src/proxy.ts). Otherwise a session cookie (ends with the
 *   browser) and a 24h sliding DB window.
 * - Cookies: httpOnly, sameSite=lax, `__Host-` prefix and Secure in production.
 *
 * Writing or deleting cookies (createSession, invalidateSession) is only allowed in Server
 * Actions and Route Handlers, not during Server Component rendering.
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
  session: { id: string; userId: string; expiresAt: Date; remember: boolean };
  user: SessionUser;
};

function lifetimes(remember: boolean) {
  return remember
    ? { maxAge: SESSION_MAX_AGE_SECONDS, refreshBelow: SESSION_REFRESH_THRESHOLD_SECONDS }
    : { maxAge: SHORT_SESSION_MAX_AGE_SECONDS, refreshBelow: SHORT_SESSION_REFRESH_THRESHOLD_SECONDS };
}

/**
 * Creates a session and writes the cookie. Call after a successful login; a fresh token is
 * generated on every login (session fixation protection).
 */
export async function createSession(
  userId: string,
  options: { remember?: boolean } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const remember = options.remember ?? true;
  const { maxAge } = lifetimes(remember);
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const ua = (await headers()).get("user-agent");

  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    remember,
    expiresAt,
    userAgent: ua ? ua.slice(0, 255) : null,
  });

  const store = await cookies();
  // Persistent cookie only when remembered; otherwise a browser-session cookie (no maxAge).
  store.set(SESSION_COOKIE_NAME, token, remember ? { ...sessionCookieOptions, maxAge } : sessionCookieOptions);
  if (remember) store.set(REMEMBER_COOKIE_NAME, "1", { ...sessionCookieOptions, maxAge });
  else store.set(REMEMBER_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });

  return { token, expiresAt };
}

/**
 * Validates a token (pure DB work, reads no cookies). Deletes expired sessions; a disabled
 * user invalidates all their sessions. Extends the expiry sliding-window style.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const sessionId = sha256Hex(token);
  const rows = await db
    .select({
      session: {
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        remember: sessions.remember,
      },
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

  const { maxAge, refreshBelow } = lifetimes(row.session.remember);
  if (row.session.expiresAt.getTime() - now < refreshBelow * 1000) {
    const expiresAt = new Date(now + maxAge * 1000);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date(now) }).where(eq(sessions.id, sessionId));
    row.session.expiresAt = expiresAt;
  }

  return row;
}

/**
 * Validates the request session cookie. React `cache` makes it one DB query per request.
 * Request-time API: with Cache Components the caller must sit under a <Suspense> boundary.
 */
export const validateSession = cache(async (): Promise<ValidatedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** Ends one session (logout) and clears the cookies. Server Action / Route Handler only. */
export async function invalidateSession(sessionId?: string): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const id = sessionId ?? (token ? sha256Hex(token) : null);
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  deleteSessionCookies(store);
}

/**
 * Ends ALL sessions of a user (password change/reset, account disabled). `exceptSessionId`
 * keeps the session of the device that changed the password.
 */
export async function invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  if (exceptSessionId) {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}

export function deleteSessionCookies(store: Awaited<ReturnType<typeof cookies>>) {
  store.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  store.set(REMEMBER_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** Purges expired sessions (F6 cron). Returns the number of deleted rows. */
export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return deleted.length;
}

/** A user's active sessions (settings screen). */
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
