import { OAuth2RequestError, decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/auth";
import { homePathForRole, routes, safeRedirectPath } from "@/lib/routes";
import { audit } from "@/lib/server/audit";
import { safeEqual } from "@/lib/server/crypto";
import { createSession } from "@/lib/server/session";
import {
  GOOGLE_FLOW_COOKIE,
  createGoogleClient,
  decodeFlowCookie,
  googleFlowCookieOptions,
  isGoogleLoginEnabled,
  readGoogleClaims,
  type GoogleIntent,
} from "@/server/auth/google";
import { findUserByGoogleSub, linkGoogleAccount } from "@/server/auth/service";

const errorPath = (intent: GoogleIntent) =>
  intent === "link" ? `${routes.account}?oauth=error` : `${routes.login}?oauth=error`;

/** Finishes the Google flow. Every path ends in a redirect (see F1 contract section 4). */
export async function GET(request: NextRequest) {
  const store = await cookies();
  const flow = decodeFlowCookie(store.get(GOOGLE_FLOW_COOKIE)?.value);
  // The flow cookie is single use.
  store.set(GOOGLE_FLOW_COOKIE, "", { ...googleFlowCookieOptions, maxAge: 0 });

  if (!isGoogleLoginEnabled() || !flow) redirect(`${routes.login}?oauth=error`);

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state || !safeEqual(state, flow.state)) redirect(errorPath(flow.intent));

  let claims: { sub: string; email: string | null } | null;
  try {
    const tokens = await createGoogleClient().validateAuthorizationCode(code, flow.verifier);
    claims = readGoogleClaims(decodeIdToken(tokens.idToken()));
  } catch (error) {
    if (!(error instanceof OAuth2RequestError)) console.error("[auth] google callback failed");
    claims = null;
  }
  if (!claims) redirect(errorPath(flow.intent));

  if (flow.intent === "link") {
    const user = await getAuthUser();
    if (!user) redirect(routes.login);
    const result = await linkGoogleAccount({ userId: user.id, sub: claims.sub, email: claims.email });
    redirect(`${routes.account}?oauth=${result === "linked" ? "linked" : "taken"}`);
  }

  const linked = await findUserByGoogleSub(claims.sub);
  if (!linked) redirect(`${routes.register}?oauth=unlinked`);
  if (linked.status !== "active") redirect(errorPath("login"));

  await createSession(linked.userId, { remember: true });
  await audit(linked.userId, "auth.login", { type: "user", id: linked.userId }, { provider: "google" });
  redirect(
    linked.mustChangePassword
      ? routes.changePassword
      : safeRedirectPath(flow.next, homePathForRole(linked.role)),
  );
}
