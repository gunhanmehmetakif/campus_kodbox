import "server-only";

import { Google } from "arctic";

import { env, isGoogleLoginEnabled } from "@/lib/env";
import { sign, unsign } from "@/lib/server/crypto";
import { sessionCookieOptions } from "@/lib/session-cookie";

/**
 * Google OAuth helpers (Arctic v3). State, PKCE verifier, intent and `next` travel in one
 * signed, httpOnly cookie that lives 10 minutes.
 */

export type GoogleIntent = "login" | "link";

export type GoogleFlowCookie = {
  state: string;
  verifier: string;
  intent: GoogleIntent;
  next: string | null;
};

const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";
export const GOOGLE_FLOW_COOKIE = `${prefix}kodbox_google_flow`;
export const GOOGLE_FLOW_MAX_AGE_SECONDS = 10 * 60;
export const GOOGLE_SCOPES = ["openid", "email"];

export const googleFlowCookieOptions = {
  ...sessionCookieOptions,
  maxAge: GOOGLE_FLOW_MAX_AGE_SECONDS,
};

export { isGoogleLoginEnabled };

export function createGoogleClient(): Google {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google login is not configured.");
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.APP_URL}/api/auth/google/callback`);
}

export function encodeFlowCookie(flow: GoogleFlowCookie): string {
  return sign(Buffer.from(JSON.stringify(flow), "utf8").toString("base64url"));
}

export function decodeFlowCookie(value: string | undefined): GoogleFlowCookie | null {
  if (!value) return null;
  const payload = unsign(value);
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<GoogleFlowCookie>;
    if (typeof data.state !== "string" || typeof data.verifier !== "string") return null;
    if (data.intent !== "login" && data.intent !== "link") return null;
    return {
      state: data.state,
      verifier: data.verifier,
      intent: data.intent,
      next: typeof data.next === "string" ? data.next : null,
    };
  } catch {
    return null;
  }
}

/** Reads the claims we need from a Google ID token payload. */
export function readGoogleClaims(claims: unknown): { sub: string; email: string | null } | null {
  if (typeof claims !== "object" || claims === null) return null;
  const { sub, email } = claims as { sub?: unknown; email?: unknown };
  if (typeof sub !== "string" || sub.length === 0) return null;
  return { sub, email: typeof email === "string" ? email : null };
}
