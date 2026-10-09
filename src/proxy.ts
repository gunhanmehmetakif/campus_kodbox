import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, loginUrl } from "@/lib/routes";
import {
  PATHNAME_HEADER,
  REMEMBER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

/**
 * Proxy (the Next 16 name for middleware): an OPTIMISTIC check only.
 *
 * 1. On protected routes without a session cookie, redirect to /giris?next=... without a DB call.
 * 2. For "remember me" sessions, renew the cookie lifetime on page navigations (sliding
 *    session; the DB side lives in server/session.ts).
 * 3. Pass the request path to server components via the `x-kodbox-pathname` header.
 *
 * Real authorization happens in every page/action with requireUser/requireRole.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const remember = request.cookies.get(REMEMBER_COOKIE_NAME)?.value === "1";

  if (!token && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(loginUrl(pathname + search), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname + search);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (token && remember && request.method === "GET") {
    const options = { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS };
    response.cookies.set(SESSION_COOKIE_NAME, token, options);
    response.cookies.set(REMEMBER_COOKIE_NAME, "1", options);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images, favicon and files with an extension.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|js)$).*)",
  ],
};
