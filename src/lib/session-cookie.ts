/**
 * Session cookie constants. NOT `server-only`: src/proxy.ts uses them too.
 * The cookie holds only a random token, never user data.
 */

const isProd = process.env.NODE_ENV === "production";

/** `__Host-` prefix in production: browser accepts it only with Secure + Path=/ + no Domain. */
const prefix = isProd ? "__Host-" : "";

export const SESSION_COOKIE_NAME = `${prefix}kodbox_session`;

/**
 * Companion flag cookie: present when the user chose "remember me". The proxy refreshes the
 * session cookie lifetime only when it is set; without it the session cookie ends with the browser.
 */
export const REMEMBER_COOKIE_NAME = `${prefix}kodbox_remember`;

/** "Remember me" session lifetime: 90 days, sliding. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/** Remaining lifetime below this threshold extends the DB expiry. */
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 45;

/** Non-remembered sessions: cookie ends with the browser; DB expiry is a 24h sliding window. */
export const SHORT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
export const SHORT_SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 12;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

/** Header the proxy uses to pass the request path to server components. */
export const PATHNAME_HEADER = "x-kodbox-pathname";
