import "server-only";

import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { env, isPushConfigured } from "@/lib/env";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

/** Web push delivery (docs/fazlar/F5-F6-ogrenci-bildirim.md 3.2). */

export type PushMessage = { title: string; body: string; url: string; tag: string; urgent?: boolean };

const CONCURRENCY = 10;
const TTL_SECONDS = 86_400;

export function getPushPublicKey(): string | null {
  return isPushConfigured() ? (env.VAPID_PUBLIC_KEY ?? null) : null;
}

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT ?? env.APP_URL,
      env.VAPID_PUBLIC_KEY as string,
      env.VAPID_PRIVATE_KEY as string,
    );
    vapidConfigured = true;
  }
  return true;
}

/** Sends a message to every subscription of the given users. Never throws. */
export async function deliverPush(
  userIds: readonly string[],
  message: PushMessage,
): Promise<{ sent: number; removed: number }> {
  const result = { sent: 0, removed: 0 };
  if (userIds.length === 0) return result;
  try {
    if (!ensureVapid()) return result;
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, [...userIds]));
    if (subs.length === 0) return result;

    const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: message.tag });
    const options = { TTL: TTL_SECONDS, urgency: message.urgent ? ("high" as const) : ("normal" as const) };

    let next = 0;
    const worker = async () => {
      while (next < subs.length) {
        const sub = subs[next++]!;
        if (!isAllowedPushEndpoint(sub.endpoint)) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          result.removed += 1;
          continue;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            options,
          );
          await db.update(pushSubscriptions).set({ lastUsedAt: new Date() }).where(eq(pushSubscriptions.id, sub.id));
          result.sent += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            result.removed += 1;
          } else {
            console.error("[push] delivery failed", status ?? (error as Error).name);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, subs.length) }, worker));
  } catch (error) {
    console.error("[push] unexpected error", (error as Error).name);
  }
  return result;
}
