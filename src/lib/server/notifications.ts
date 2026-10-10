import "server-only";

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { after } from "next/server";

import { db, type DbOrTx } from "@/db";
import { notifications } from "@/db/schema";
import { isPushConfigured } from "@/lib/env";
import { formatNotification } from "@/lib/notification-format";

import { deliverPush } from "./push";

/**
 * In-app notifications (PRD section 6). F0 provides the data API and a push hook stub;
 * triggers and the bell UI come in later phases, web push delivery in F6.
 *
 * To add a notification type: add it to NotificationPayloads, then map its text/icon in the
 * notification list UI. Never put personal data (email, student no) in a payload; ids and
 * titles are enough.
 */
export type NotificationPayloads = {
  "course.enrolled": { courseId: string; courseCode: string; courseName: string };
  "post.published": {
    courseId: string;
    courseCode: string;
    postId: string;
    postType: "announcement" | "material";
    title: string;
  };
  "assignment.published": {
    courseId: string;
    courseCode: string;
    assignmentId: string;
    title: string;
    dueAt: string | null;
  };
  "assignment.dates_changed": {
    courseId: string;
    courseCode: string;
    assignmentId: string;
    title: string;
    dueAt: string | null;
    lateUntil: string | null;
  };
  /** 24 hours left (students without a submission). Delivered as push as well. */
  "assignment.due_soon": { courseId: string; courseCode: string; assignmentId: string; title: string; dueAt: string };
  "submission.score_published": { courseId: string; courseCode: string; assignmentId: string; title: string };
};

export type NotificationType = keyof NotificationPayloads;

/**
 * Sends web push for a notification after the response (`after`), so it never goes out before
 * the surrounding transaction commits. Never throws: outside a request scope (tests, scripts)
 * push is skipped.
 */
export async function sendPushForNotification(
  userIds: readonly string[],
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    if (userIds.length === 0 || !isPushConfigured()) return;
    const view = formatNotification(type, payload);
    const topic = [payload.assignmentId, payload.postId, payload.courseId].find((v) => typeof v === "string");
    const message = {
      title: view.title,
      body: view.body,
      url: view.href,
      tag: `${type}:${typeof topic === "string" ? topic : "general"}`,
      urgent: type === "assignment.due_soon",
    };
    const ids = [...userIds];
    after(() => deliverPush(ids, message));
  } catch {
    // `after` outside a request scope, or env not configured: skip push.
  }
}

/**
 * Writes notifications for users (bulk insert) and triggers push delivery. Does nothing for an
 * empty list. Pass `tx` inside a transaction so the notification commits with the change.
 * @example await notify(studentIds, "post.published", { courseId, courseCode, postId, postType: "announcement", title })
 */
export async function notify<T extends NotificationType>(
  userIds: readonly string[],
  type: T,
  payload: NotificationPayloads[T],
  executor: DbOrTx = db,
): Promise<number> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return 0;
  const CHUNK = 1000;
  let inserted = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = unique.slice(i, i + CHUNK).map((userId) => ({ userId, type, payload }));
    await executor.insert(notifications).values(batch);
    inserted += batch.length;
  }
  await sendPushForNotification(unique, type, payload);
  return inserted;
}

/** Unread notification count (bell badge). */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

/** Latest notifications, newest first. */
export async function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Marks notifications read; all of the user's when `ids` is omitted. The user id is always part
 * of the condition, so someone else's notification can never be marked.
 */
export async function markNotificationsRead(userId: string, ids?: readonly string[]): Promise<void> {
  if (ids && ids.length === 0) return;
  const conditions = [eq(notifications.userId, userId), isNull(notifications.readAt)];
  if (ids) conditions.push(inArray(notifications.id, [...ids]));
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions));
}
