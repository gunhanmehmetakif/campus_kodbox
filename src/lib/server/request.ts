import "server-only";

import { headers } from "next/headers";

/**
 * İstemci IP'si. Canlıda Coolify/Traefik ters vekili `x-forwarded-for` ekler; ilk değer
 * gerçek istemcidir. Sadece rate limit ve Turnstile için kullanılır; DB'ye kalıcı yazılmaz.
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
