import "server-only";

import { connection } from "next/server";

import { requireUser } from "@/lib/auth";
import type { Page } from "@/lib/page";
import { getUnreadNotificationCount } from "@/lib/server/notifications";
import { getPushPublicKey } from "@/lib/server/push";

import { listNotificationPage, type NotificationListItem } from "./service";

export type { NotificationListItem, Page };

export async function listMyNotifications(o: { page?: number } = {}): Promise<Page<NotificationListItem>> {
  await connection();
  const user = await requireUser();
  return listNotificationPage(user.id, o.page);
}

export async function getMyUnreadCount(): Promise<number> {
  await connection();
  const user = await requireUser();
  return getUnreadNotificationCount(user.id);
}

/** Public VAPID key for the client, null when push is not configured. */
export async function getPushConfig(): Promise<{ publicKey: string | null }> {
  await connection();
  await requireUser();
  return { publicKey: getPushPublicKey() };
}
