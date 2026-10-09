import "server-only";

import { headers } from "next/headers";

/**
 * Client IP. Behind the Coolify/Traefik reverse proxy `x-forwarded-for` carries the real client
 * as its first value. Used only for rate limiting and Turnstile; never stored permanently.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || h.get("cf-connecting-ip")?.trim() || "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
