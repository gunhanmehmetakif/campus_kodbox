import "server-only";

import { env } from "@/lib/env";
import { TURNSTILE_FIELD } from "@/lib/turnstile";

export { TURNSTILE_FIELD };

/**
 * Cloudflare Turnstile server verification.
 * Dev bypass: TURNSTILE_DEV_BYPASS=true skips the remote call (refused in production by env validation).
 *
 * @example
 *   const captcha = await verifyTurnstile(formData.get(TURNSTILE_FIELD), await getClientIp());
 *   if (!captcha.ok) return fail("Robot doğrulaması tamamlanmadı. Tekrar dene.");
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = { ok: true } | { ok: false; errorCodes: string[] };

function failed(errorCodes: string[]): TurnstileResult {
  console.warn("[turnstile] verification failed", { errorCodes });
  return { ok: false, errorCodes };
}

export async function verifyTurnstile(
  token: FormDataEntryValue | string | null | undefined,
  ip?: string | null,
): Promise<TurnstileResult> {
  if (env.TURNSTILE_DEV_BYPASS) return { ok: true };

  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return failed(["missing-input-response"]);
  }

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  body.set("idempotency_key", crypto.randomUUID());

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return failed([`http-${res.status}`]);
    const data = (await res.json()) as { success: boolean; hostname?: string; "error-codes"?: string[] };
    if (!data.success) return failed(data["error-codes"] ?? ["unknown"]);
    if (env.NODE_ENV === "production" && data.hostname !== new URL(env.APP_URL).hostname) {
      return failed(["hostname-mismatch"]);
    }
    return { ok: true };
  } catch (error) {
    console.error("[turnstile] verification request failed", error);
    return failed(["network-error"]);
  }
}

/** Site key for the client widget (pass from a server component as a prop). */
export function getTurnstileSiteKey(): string {
  // No widget in bypass mode: the server skips verification, so the client must not wait for a token.
  return env.TURNSTILE_DEV_BYPASS ? "" : env.TURNSTILE_SITE_KEY;
}
