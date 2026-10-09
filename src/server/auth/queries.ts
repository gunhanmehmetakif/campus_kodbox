import "server-only";

import { connection } from "next/server";

import type { UserRole as Role } from "@/db/schema";
import { requireUser, userLabel } from "@/lib/auth";
import { isGoogleLoginEnabled } from "@/lib/env";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

import { countOtherSessions, getGoogleLink, requireDefaultSchool, resetTokenState, verifyTokenState } from "./service";

export type AuthPageConfig = {
  googleEnabled: boolean;
  turnstileSiteKey: string;
  studentEmailDomain: string; // "ogr.mku.edu.tr"
  staffEmailDomain: string; // "mku.edu.tr"
};

export type TokenState = { status: "valid"; email: string } | { status: "invalid" | "expired" | "used" };

export type AccountOverview = {
  role: Role;
  label: string;
  email: string;
  google: { email: string | null } | null;
  googleEnabled: boolean;
  otherSessionCount: number;
};

export async function getAuthPageConfig(): Promise<AuthPageConfig> {
  await connection();
  const school = await requireDefaultSchool();
  return {
    googleEnabled: isGoogleLoginEnabled(),
    turnstileSiteKey: getTurnstileSiteKey(),
    studentEmailDomain: school.studentEmailDomain,
    staffEmailDomain: school.staffEmailDomain,
  };
}

export async function getVerifyTokenState(token: string): Promise<TokenState> {
  await connection();
  return verifyTokenState(token);
}

export async function getResetTokenState(token: string): Promise<TokenState> {
  await connection();
  return resetTokenState(token);
}

export async function getAccountOverview(): Promise<AccountOverview> {
  const user = await requireUser({ allowPendingPasswordChange: false });
  const [google, otherSessionCount] = await Promise.all([
    getGoogleLink(user.id),
    countOtherSessions(user.id, user.sessionId),
  ]);
  return {
    role: user.role,
    label: userLabel(user),
    email: user.email,
    google,
    googleEnabled: isGoogleLoginEnabled(),
    otherSessionCount,
  };
}
