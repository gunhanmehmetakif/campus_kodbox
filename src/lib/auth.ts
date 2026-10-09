import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { ThemePreference, UserRole, UserStatus } from "@/db/schema";
import { homePathForRole, loginUrl, routes } from "@/lib/routes";
import { PATHNAME_HEADER } from "@/lib/session-cookie";

import { decrypt, decryptNullable } from "./server/crypto";
import { validateSession } from "./server/session";

/**
 * Authorization helpers (data access layer entry point).
 *
 * Every page, layout, Server Action and Route Handler checks its own authorization.
 * The proxy is only an optimistic pre-check.
 *
 *   const user = await requireRole("instructor");
 *
 * These read request-time APIs: under Cache Components call them inside <Suspense>/loading.tsx.
 */

/** Full authenticated user for backend code (superset of CurrentUser). */
export type AuthUser = {
  id: string;
  sessionId: string;
  role: UserRole;
  schoolId: string;
  /** Decrypted school email. Mask it (maskEmail) before sending to the client. */
  email: string;
  /** Decrypted student number (students only). */
  studentNo: string | null;
  displayName: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  theme: ThemePreference;
};

/** The signed-in active user (full backend shape) or null. One DB query per request (React cache). */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const result = await validateSession();
  if (!result || result.user.status !== "active") return null;
  const { user, session } = result;
  return {
    id: user.id,
    sessionId: session.id,
    role: user.role,
    schoolId: user.schoolId,
    email: decrypt(user.emailEnc),
    studentNo: decryptNullable(user.studentNoEnc),
    displayName: user.displayName,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    theme: user.theme,
  };
});

/** Contract shape for the frontend (docs/SOZLESME.md 2.1). Nothing encrypted or sensitive. */
export type CurrentUser = Pick<AuthUser, "id" | "role" | "displayName" | "mustChangePassword">;

/** The signed-in active user or null (contract shape). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return { id: user.id, role: user.role, displayName: user.displayName, mustChangePassword: user.mustChangePassword };
}

/** Current request path (+ query) from the proxy header, or null. */
export async function getRequestPath(): Promise<string | null> {
  return (await headers()).get(PATHNAME_HEADER);
}

type RequireOptions = {
  /** Let a user with must_change_password in (only /sifre-degistir and logout). */
  allowPendingPasswordChange?: boolean;
};

/**
 * Requires a session. Without one, redirects to /giris?next=<path>. A user who must change
 * their password is forced to /sifre-degistir.
 */
export async function requireUser(options: RequireOptions = {}): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect(loginUrl(await getRequestPath()));
  if (user.mustChangePassword && !options.allowPendingPasswordChange) redirect(routes.changePassword);
  return user;
}

/**
 * Requires one of the given roles; other roles are sent to their own home.
 * @example const user = await requireRole("admin")
 * @example const user = await requireRole("admin", "instructor")
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

/** For guest pages (login, register, forgot password): signed-in users go to their home. */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getAuthUser();
  if (user) redirect(user.mustChangePassword ? routes.changePassword : homePathForRole(user.role));
}

/** Display label: staff display_name, student number (own account). */
export function userLabel(user: Pick<AuthUser, "role" | "displayName" | "studentNo" | "email">): string {
  if (user.role === "student") return user.studentNo ?? user.email;
  return user.displayName ?? user.email;
}
