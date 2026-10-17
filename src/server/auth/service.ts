import "server-only";

import { and, count, eq, gt, inArray, isNull, ne } from "drizzle-orm";

import { db, type DbOrTx } from "@/db";
import {
  courseRoster,
  courses,
  emailTokens,
  oauthAccounts,
  schools,
  sessions,
  terms,
  users,
  type School,
  type User,
  type UserRole,
} from "@/db/schema";
import {
  isValidStaffLocalPart,
  isValidStudentNo,
  normalizeStudentNo,
  parseLoginInput,
  staffEmail,
  studentEmail,
  type LoginKind,
} from "@/lib/identity";
import { routes } from "@/lib/routes";
import { audit } from "@/lib/server/audit";
import { isCommonPassword } from "@/lib/server/common-passwords";
import { blindIndex, decrypt, encrypt, encryptNullable, generateToken, sha256Hex } from "@/lib/server/crypto";
import { absoluteUrl, sendMail } from "@/lib/server/mail";
import { hashPassword, verifyPassword, verifyPasswordDummy } from "@/lib/server/password";
import { RATE_LIMITS, consume, peek, rateLimitKey, resetRateLimit } from "@/lib/server/rate-limit";
import { getDefaultSchool } from "@/lib/server/schools";
import { invalidateAllUserSessions } from "@/lib/server/session";

import { existingAccountMail, passwordResetMail, verificationMail, type AuthMail } from "./mail-templates";

/**
 * Auth business logic (docs/fazlar/F1-kimlik.md section 8). Server actions stay thin: they
 * parse the form, verify Turnstile, call these functions, then set cookies and redirect.
 * Nothing here touches cookies or headers, so it is testable against the database.
 *
 * Rules: neutral outcomes that never reveal whether an account exists; tokens are stored
 * hashed and consumed atomically (UPDATE ... WHERE used_at IS NULL).
 */

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Runs `task` after the response when given (equalizes timing); otherwise awaits it. */
export type Deferrer = (task: () => Promise<unknown>) => void;
export type ServiceOptions = { defer?: Deferrer };

type Purpose = "verify" | "reset";

/* ───────────────────────────── helpers ───────────────────────────── */

export async function requireDefaultSchool(): Promise<School> {
  const school = await getDefaultSchool();
  if (!school) throw new Error("No school configured; run the seed.");
  return school;
}

type Identity = { kind: LoginKind; email: string; emailHash: string; studentNo: string | null };

/** Turns form input into a school email identity, or null when it cannot be one. */
export function resolveIdentity(kind: LoginKind, rawLocal: string, school: School): Identity | null {
  const parsed = parseLoginInput(rawLocal, school);
  if (parsed.foreignDomain) return null;
  const resolved = parsed.detectedKind ?? kind;
  if (resolved === "student") {
    const studentNo = normalizeStudentNo(parsed.local);
    if (!studentNo) return null;
    const email = studentEmail(studentNo, school);
    return { kind: resolved, email, emailHash: blindIndex(email), studentNo };
  }
  if (!isValidStaffLocalPart(parsed.local)) return null;
  const email = staffEmail(parsed.local, school);
  return { kind: resolved, email, emailHash: blindIndex(email), studentNo: null };
}

async function findUserByEmailHash(emailHash: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.emailHash, emailHash)).limit(1);
  return row ?? null;
}

async function deliver(options: ServiceOptions, to: string, mail: AuthMail): Promise<void> {
  const task = async () => {
    const result = await sendMail({ to, ...mail });
    if (!result.ok) console.error("[auth] mail could not be sent");
  };
  if (options.defer) options.defer(task);
  else await task();
}

/** Verify tokens carry the encrypted student number (no pending user row exists yet). */
function buildVerifyToken(studentNo: string): string {
  return `${generateToken(32)}.${Buffer.from(encrypt(studentNo), "utf8").toString("base64url")}`;
}

/** Only call for a token whose hash matched a DB row (that proves the payload is ours). */
function readVerifyPayload(rawToken: string): string | null {
  const idx = rawToken.indexOf(".");
  if (idx <= 0) return null;
  try {
    return decrypt(Buffer.from(rawToken.slice(idx + 1), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function createEmailToken(input: {
  userId: string | null;
  schoolId: string;
  loginIdHash: string;
  purpose: Purpose;
  ttlMs: number;
  rawToken?: string;
}): Promise<string> {
  const rawToken = input.rawToken ?? generateToken(32);
  const now = new Date();
  await db.transaction(async (tx) => {
    // A newer link replaces older unused ones of the same kind.
    await tx
      .update(emailTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailTokens.loginIdHash, input.loginIdHash),
          eq(emailTokens.purpose, input.purpose),
          isNull(emailTokens.usedAt),
        ),
      );
    await tx.insert(emailTokens).values({
      userId: input.userId,
      schoolId: input.schoolId,
      loginIdHash: input.loginIdHash,
      purpose: input.purpose,
      tokenHash: sha256Hex(rawToken),
      expiresAt: new Date(now.getTime() + input.ttlMs),
    });
  });
  return rawToken;
}

type TokenRow = typeof emailTokens.$inferSelect;

async function findToken(rawToken: string, purpose: Purpose): Promise<TokenRow | null> {
  if (!rawToken || rawToken.length > 512) return null;
  const [row] = await db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, sha256Hex(rawToken)), eq(emailTokens.purpose, purpose)))
    .limit(1);
  return row ?? null;
}

function tokenStatus(row: TokenRow | null): "valid" | "invalid" | "expired" | "used" {
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "valid";
}

/** Single-use consumption: exactly one concurrent caller gets the row. */
async function consumeToken(executor: DbOrTx, rawToken: string, purpose: Purpose): Promise<TokenRow | null> {
  const now = new Date();
  const [row] = await executor
    .update(emailTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(emailTokens.tokenHash, sha256Hex(rawToken)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

/* ───────────────────────────── token state (queries) ───────────────────────────── */

export type TokenStateResult = { status: "valid"; email: string } | { status: "invalid" | "expired" | "used" };

export async function verifyTokenState(rawToken: string): Promise<TokenStateResult> {
  const row = await findToken(rawToken, "verify");
  const status = tokenStatus(row);
  if (!row || status !== "valid") return { status: status === "valid" ? "invalid" : status };
  const studentNo = readVerifyPayload(rawToken);
  const [school] = await db.select().from(schools).where(eq(schools.id, row.schoolId)).limit(1);
  if (!studentNo || !school) return { status: "invalid" };
  const email = studentEmail(studentNo, school);
  if (blindIndex(email) !== row.loginIdHash) return { status: "invalid" };
  return { status: "valid", email };
}

export async function resetTokenState(rawToken: string): Promise<TokenStateResult> {
  const row = await findToken(rawToken, "reset");
  const status = tokenStatus(row);
  if (!row || status !== "valid") return { status: status === "valid" ? "invalid" : status };
  if (!row.userId) return { status: "invalid" };
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || user.status !== "active") return { status: "invalid" };
  return { status: "valid", email: decrypt(user.emailEnc) };
}

/* ───────────────────────────── register / resend ───────────────────────────── */

export type MailRequestOutcome =
  | { status: "sent" }
  | { status: "invalid_input" }
  | { status: "ip_limited"; retryAfter: number }
  | { status: "cooldown"; retryAfter: number };

/**
 * Sends the verification mail (or the "you already have an account" mail). The outcome is
 * `sent` whether or not the number is registered and even when the per-identity mail quota
 * is exhausted (silent drop), so nothing leaks.
 */
export async function requestRegistration(
  input: { local: string; ip: string; cooldown?: boolean },
  options: ServiceOptions = {},
): Promise<MailRequestOutcome> {
  const school = await requireDefaultSchool();
  const studentNo = normalizeStudentNo(input.local);
  if (!isValidStudentNo(studentNo, school)) return { status: "invalid_input" };

  const email = studentEmail(studentNo, school);
  const emailHash = blindIndex(email);

  if (input.cooldown) {
    const cd = await consume(rateLimitKey("resend", emailHash), RATE_LIMITS.resendCooldown);
    if (!cd.ok) return { status: "cooldown", retryAfter: cd.retryAfter };
  }
  const ipLimit = await consume(rateLimitKey("auth-ip", input.ip), RATE_LIMITS.authRequestPerIp);
  if (!ipLimit.ok) return { status: "ip_limited", retryAfter: ipLimit.retryAfter };
  const idLimit = await consume(rateLimitKey("mail", emailHash), RATE_LIMITS.mailPerIdentity);
  if (!idLimit.ok) return { status: "sent" };

  const existing = await findUserByEmailHash(emailHash);
  if (existing) {
    if (existing.status === "active") {
      const token = await createEmailToken({
        userId: existing.id,
        schoolId: school.id,
        loginIdHash: emailHash,
        purpose: "reset",
        ttlMs: RESET_TOKEN_TTL_MS,
      });
      await deliver(options, email, existingAccountMail(absoluteUrl(routes.resetPassword(token))));
    }
    return { status: "sent" };
  }

  const token = await createEmailToken({
    userId: null,
    schoolId: school.id,
    loginIdHash: emailHash,
    purpose: "verify",
    ttlMs: VERIFY_TOKEN_TTL_MS,
    rawToken: buildVerifyToken(studentNo),
  });
  await deliver(options, email, verificationMail(absoluteUrl(routes.verifyEmail(token))));
  return { status: "sent" };
}

/* ───────────────────────────── complete registration ───────────────────────────── */

export type CompleteRegistrationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" | "common_password" };

class TokenRace extends Error {}

export async function completeRegistration(input: {
  token: string;
  password: string;
}): Promise<CompleteRegistrationResult> {
  const state = await verifyTokenState(input.token);
  if (state.status !== "valid") return { ok: false, reason: state.status };
  if (isCommonPassword(input.password)) return { ok: false, reason: "common_password" };

  const passwordHash = await hashPassword(input.password);
  try {
    const userId = await db.transaction(async (tx) => {
      const row = await consumeToken(tx, input.token, "verify");
      if (!row) throw new TokenRace();
      const studentNo = readVerifyPayload(input.token);
      const [school] = await tx.select().from(schools).where(eq(schools.id, row.schoolId)).limit(1);
      if (!studentNo || !school) throw new TokenRace();

      const email = studentEmail(studentNo, school);
      const studentNoHash = blindIndex(studentNo);
      const now = new Date();
      const [user] = await tx
        .insert(users)
        .values({
          role: "student",
          schoolId: school.id,
          emailEnc: encrypt(email),
          emailHash: blindIndex(email),
          studentNoEnc: encrypt(studentNo),
          studentNoHash,
          passwordHash,
          status: "active",
          kvkkAcceptedAt: now,
          emailVerifiedAt: now,
          passwordChangedAt: now,
          lastLoginAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (!user) throw new TokenRace();

      const schoolCourseIds = tx
        .select({ id: courses.id })
        .from(courses)
        .innerJoin(terms, eq(terms.id, courses.termId))
        .where(eq(terms.schoolId, school.id));
      await tx
        .update(courseRoster)
        .set({ userId: user.id })
        .where(
          and(
            eq(courseRoster.studentNoHash, studentNoHash),
            isNull(courseRoster.userId),
            inArray(courseRoster.courseId, schoolCourseIds),
          ),
        );

      await audit(user.id, "user.register", { type: "user", id: user.id }, {}, tx);
      return user.id;
    });
    return { ok: true, userId };
  } catch (error) {
    if (error instanceof TokenRace) return { ok: false, reason: "used" };
    throw error;
  }
}

/* ───────────────────────────── login ───────────────────────────── */

export type AuthenticateResult =
  | { ok: true; userId: string; role: UserRole; mustChangePassword: boolean }
  | { ok: false; reason: "invalid"; attemptsLeft?: number }
  | { ok: false; reason: "locked"; retryAfter: number };

/** Checks the per-IP failed-login budget without counting (called by the action before the captcha). */
export function checkLoginIpBudget(ip: string) {
  return peek(rateLimitKey("login-ip", ip), RATE_LIMITS.loginPerIp);
}

/** Counts one failed login (bad captcha or bad credentials) against the IP. */
export function recordLoginIpFailure(ip: string) {
  return consume(rateLimitKey("login-ip", ip), RATE_LIMITS.loginPerIp);
}

/** `attemptsLeft` is only set when 1 or 2 failures remain before the account lock. */
export async function authenticate(input: {
  kind: LoginKind;
  local: string;
  password: string;
}): Promise<AuthenticateResult> {
  const school = await requireDefaultSchool();

  const identity = resolveIdentity(input.kind, input.local, school);
  if (!identity) {
    await verifyPasswordDummy(input.password);
    return { ok: false, reason: "invalid" };
  }

  // The lock applies to existing and non-existing identities alike.
  const failKey = rateLimitKey("login-fail", identity.emailHash);
  const lock = await peek(failKey, RATE_LIMITS.loginFailures);
  if (lock.limited) return { ok: false, reason: "locked", retryAfter: lock.retryAfter };

  const user = await findUserByEmailHash(identity.emailHash);
  const verified = user?.passwordHash
    ? await verifyPassword(user.passwordHash, input.password)
    : await verifyPasswordDummy(input.password);

  if (!user || !verified || user.status !== "active") {
    const { remaining } = await consume(failKey, RATE_LIMITS.loginFailures);
    if (remaining === 0) {
      // This failure reached the limit: show the lock message right away.
      const { retryAfter } = await peek(failKey, RATE_LIMITS.loginFailures);
      return { ok: false, reason: "locked", retryAfter };
    }
    return remaining <= 2 ? { ok: false, reason: "invalid", attemptsLeft: remaining } : { ok: false, reason: "invalid" };
  }

  await resetRateLimit(failKey);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await audit(user.id, "auth.login", { type: "user", id: user.id });
  return { ok: true, userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword };
}

/* ───────────────────────────── forgot / reset ───────────────────────────── */

export type ForgotPasswordOutcome = { status: "sent" } | { status: "ip_limited"; retryAfter: number };

export async function requestPasswordReset(
  input: { kind: LoginKind; local: string; ip: string },
  options: ServiceOptions = {},
): Promise<ForgotPasswordOutcome> {
  const school = await requireDefaultSchool();
  const ipLimit = await consume(rateLimitKey("auth-ip", input.ip), RATE_LIMITS.authRequestPerIp);
  if (!ipLimit.ok) return { status: "ip_limited", retryAfter: ipLimit.retryAfter };

  const identity = resolveIdentity(input.kind, input.local, school);
  if (!identity) return { status: "sent" };
  const idLimit = await consume(rateLimitKey("mail", identity.emailHash), RATE_LIMITS.mailPerIdentity);
  if (!idLimit.ok) return { status: "sent" };

  const user = await findUserByEmailHash(identity.emailHash);
  if (!user || user.status !== "active") return { status: "sent" };

  const token = await createEmailToken({
    userId: user.id,
    schoolId: user.schoolId,
    loginIdHash: identity.emailHash,
    purpose: "reset",
    ttlMs: RESET_TOKEN_TTL_MS,
  });
  await deliver(options, identity.email, passwordResetMail(absoluteUrl(routes.resetPassword(token))));
  return { status: "sent" };
}

export type ResetPasswordResult =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; reason: "invalid" | "expired" | "used" | "common_password" };

export async function resetPassword(input: { token: string; password: string }): Promise<ResetPasswordResult> {
  const state = await resetTokenState(input.token);
  if (state.status !== "valid") return { ok: false, reason: state.status };
  if (isCommonPassword(input.password)) return { ok: false, reason: "common_password" };

  const passwordHash = await hashPassword(input.password);
  const result = await db.transaction(async (tx) => {
    const row = await consumeToken(tx, input.token, "reset");
    if (!row?.userId) return null;
    const [user] = await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, passwordChangedAt: new Date() })
      .where(and(eq(users.id, row.userId), eq(users.status, "active")))
      .returning({ id: users.id, role: users.role, emailHash: users.emailHash });
    if (!user) return null;
    await audit(user.id, "auth.password_reset", { type: "user", id: user.id }, {}, tx);
    return user;
  });
  if (!result) return { ok: false, reason: "used" };

  await invalidateAllUserSessions(result.id);
  await resetRateLimit(rateLimitKey("login-fail", result.emailHash));
  return { ok: true, userId: result.id, role: result.role };
}

/* ───────────────────────────── change password ───────────────────────────── */

export type ChangePasswordResult =
  | { ok: true; role: UserRole }
  | { ok: false; reason: "wrong_current" | "same_password" | "common_password" | "not_found" }
  | { ok: false; reason: "locked"; retryAfter: number };

export async function changePassword(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const failKey = rateLimitKey("pwchange-fail", input.userId);
  const lock = await peek(failKey, RATE_LIMITS.loginFailures);
  if (lock.limited) return { ok: false, reason: "locked", retryAfter: lock.retryAfter };

  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user?.passwordHash || user.status !== "active") return { ok: false, reason: "not_found" };

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    await consume(failKey, RATE_LIMITS.loginFailures);
    return { ok: false, reason: "wrong_current" };
  }
  if (await verifyPassword(user.passwordHash, input.newPassword)) return { ok: false, reason: "same_password" };
  if (isCommonPassword(input.newPassword)) return { ok: false, reason: "common_password" };

  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, passwordChangedAt: new Date() })
      .where(eq(users.id, user.id));
    await audit(user.id, "auth.password_change", { type: "user", id: user.id }, {}, tx);
  });
  await invalidateAllUserSessions(user.id, input.sessionId);
  await resetRateLimit(failKey);
  return { ok: true, role: user.role };
}

/* ───────────────────────────── sessions ───────────────────────────── */

/** Ends every session except the current one; returns how many live sessions were closed. */
export async function signOutOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  const removed = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)))
    .returning({ expiresAt: sessions.expiresAt });
  const now = Date.now();
  return removed.filter((s) => s.expiresAt.getTime() > now).length;
}

export async function countOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId), gt(sessions.expiresAt, new Date())));
  return row?.value ?? 0;
}

/* ───────────────────────────── Google (OAuth) ───────────────────────────── */

export async function findUserByGoogleSub(
  sub: string,
): Promise<{ userId: string; role: UserRole; status: User["status"]; mustChangePassword: boolean } | null> {
  const [row] = await db
    .select({
      userId: users.id,
      role: users.role,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
    })
    .from(oauthAccounts)
    .innerJoin(users, eq(users.id, oauthAccounts.userId))
    .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerUserId, sub)))
    .limit(1);
  return row ?? null;
}

export async function getGoogleLink(userId: string): Promise<{ email: string | null } | null> {
  const [row] = await db
    .select({ providerEmailEnc: oauthAccounts.providerEmailEnc })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, "google")))
    .limit(1);
  if (!row) return null;
  return { email: row.providerEmailEnc ? decrypt(row.providerEmailEnc) : null };
}

export type LinkGoogleResult = "linked" | "taken";

/** Links a Google `sub` to the user. A `sub` that belongs to someone else is refused. */
export async function linkGoogleAccount(input: {
  userId: string;
  sub: string;
  email: string | null;
}): Promise<LinkGoogleResult> {
  const existing = await findUserByGoogleSub(input.sub);
  if (existing) return existing.userId === input.userId ? "linked" : "taken";

  try {
    await db.transaction(async (tx) => {
      // One Google account per user: a different, previously linked one is replaced.
      await tx
        .delete(oauthAccounts)
        .where(and(eq(oauthAccounts.userId, input.userId), eq(oauthAccounts.provider, "google")));
      await tx.insert(oauthAccounts).values({
        userId: input.userId,
        provider: "google",
        providerUserId: input.sub,
        providerEmailEnc: encryptNullable(input.email),
      });
      await audit(input.userId, "auth.oauth_link", { type: "user", id: input.userId }, { provider: "google" }, tx);
    });
  } catch (error) {
    // Unique violation from a concurrent link of the same `sub`.
    const owner = await findUserByGoogleSub(input.sub);
    if (owner && owner.userId !== input.userId) return "taken";
    throw error;
  }
  return "linked";
}

export async function unlinkGoogleAccount(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, "google")))
      .returning({ id: oauthAccounts.id });
    if (removed.length > 0) {
      await audit(userId, "auth.oauth_unlink", { type: "user", id: userId }, { provider: "google" }, tx);
    }
    return removed.length > 0;
  });
}
