import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, connection, type NextRequest } from "next/server";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/routes";
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_SCOPES,
  createGoogleClient,
  encodeFlowCookie,
  googleFlowCookieOptions,
  isGoogleLoginEnabled,
  type GoogleIntent,
} from "@/server/auth/google";

/** Starts the Google flow: sets the state/PKCE cookie and redirects to Google. */
export async function GET(request: NextRequest) {
  await connection();
  if (!isGoogleLoginEnabled()) return new NextResponse(null, { status: 404 });

  const params = request.nextUrl.searchParams;
  const intent: GoogleIntent = params.get("intent") === "link" ? "link" : "login";
  const nextParam = params.get("next");
  const next = nextParam ? safeRedirectPath(nextParam, "") || null : null;

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = createGoogleClient().createAuthorizationURL(state, verifier, GOOGLE_SCOPES);

  (await cookies()).set(GOOGLE_FLOW_COOKIE, encodeFlowCookie({ state, verifier, intent, next }), googleFlowCookieOptions);
  redirect(url.toString());
}
