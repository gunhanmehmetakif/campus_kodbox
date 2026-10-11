import "server-only";

import { headers } from "next/headers";

/**
 * Client IP. Chain is Cloudflare -> Traefik -> app: `cf-connecting-ip` is set by Cloudflare and
 * cannot be spoofed by the client. Otherwise `x-real-ip`, then the LAST `x-forwarded-for` entry
 * (appended by our own proxy; earlier entries are client controlled). Used only for rate limiting
 * and Turnstile; never stored permanently.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const last = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
