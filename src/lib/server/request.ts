import "server-only";

import { headers } from "next/headers";

import { isCloudflareIp } from "@/lib/ip";

/**
 * Client IP. Chain is Cloudflare -> Traefik -> app. The direct peer is `x-real-ip` (set by
 * Traefik), else the LAST `x-forwarded-for` entry (appended by our own proxy; earlier entries are
 * client controlled). `cf-connecting-ip` is trusted only when that peer is a Cloudflare edge,
 * otherwise anyone reaching the origin directly could spoof it. Used only for rate limiting and
 * Turnstile; never stored permanently.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const peer = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "";
  if (peer && isCloudflareIp(peer)) {
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  return peer || "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
