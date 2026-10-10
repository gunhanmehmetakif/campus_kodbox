import "server-only";

import { and, count, desc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications, pushSubscriptions } from "@/db/schema";
import { formatNotification, type NotificationView } from "@/lib/notification-format";
import type { Page } from "@/lib/page";

import { MAX_PUSH_SUBSCRIPTIONS_PER_USER, type SavePushSubscriptionInput } from "./schemas";

export const NOTIFICATIONS_PAGE_SIZE = 30;

export type NotificationListItem = NotificationView & {
  id: string;
  type: string;
  createdAt: Date;
  read: boolean;
};

export async function listNotificationPage(userId: string, page = 1): Promise<Page<NotificationListItem>> {
  const current = Number.isInteger(page) && page > 0 ? page : 1;
  const where = eq(notifications.userId, userId);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(NOTIFICATIONS_PAGE_SIZE)
      .offset((current - 1) * NOTIFICATIONS_PAGE_SIZE),
    db.select({ value: count() }).from(notifications).where(where),
  ]);
  return {
    items: rows.map((row) => ({
      ...formatNotification(row.type, row.payload),
      id: row.id,
      type: row.type,
      createdAt: row.createdAt,
      read: row.readAt !== null,
    })),
    total: totalRow?.value ?? 0,
    page: current,
    pageSize: NOTIFICATIONS_PAGE_SIZE,
  };
}

/** Marks one of the user's notifications read and returns its target; null when it is not theirs. */
export async function openNotification(userId: string, id: string): Promise<string | null> {
  const [row] = await db
    .update(notifications)
    .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ type: notifications.type, payload: notifications.payload });
  return row ? formatNotification(row.type, row.payload).href : null;
}

export async function markAllRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return rows.length;
}

/**
 * Upserts by endpoint (a device may move to another user) and keeps at most
 * MAX_PUSH_SUBSCRIPTIONS_PER_USER per user by deleting the oldest others.
 */
export async function savePushSubscription(
  userId: string,
  input: SavePushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  const ua = userAgent ? userAgent.slice(0, 255) : null;
  await db.transaction(async (tx) => {
    await tx
      .insert(pushSubscriptions)
      .values({ userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: ua })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: ua },
      });

    const others = await tx
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), ne(pushSubscriptions.endpoint, input.endpoint)))
      .orderBy(desc(pushSubscriptions.createdAt));
    const keep = MAX_PUSH_SUBSCRIPTIONS_PER_USER - 1;
    for (const stale of others.slice(keep)) {
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, stale.id));
    }
  });
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}
