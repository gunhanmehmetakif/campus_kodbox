import "server-only";

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, type DbOrTx } from "@/db";
import { notifications } from "@/db/schema";

/**
 * Site içi bildirimler (PLAN.md §6). F0 temel API'yi sağlar; tetikleyiciler ve zil UI'ı F6'da.
 *
 * Yeni bir bildirim türü eklerken:
 *   1. NotificationPayloads'a tür + payload tipini ekleyin,
 *   2. F6'nın bildirim listesi bileşeninde metin/ikon eşlemesini ekleyin.
 * Payload'a KİŞİSEL VERİ (mail, öğrenci no) yazmayın; id ve başlık yeterli.
 */
export type NotificationPayloads = {
  /** Öğrenci bir derse eklendi. */
  "course.enrolled": { courseId: string; courseCode: string; courseName: string };
  /** Yeni duyuru veya materyal yayınlandı. */
  "post.published": { courseId: string; courseCode: string; postId: string; postType: "announcement" | "material"; title: string };
  /** Yeni ödev yayınlandı. */
  "assignment.published": { courseId: string; courseCode: string; assignmentId: string; title: string; dueAt: string | null };
  /** Ödevin tarihleri değişti (son tarih / geç teslim). */
  "assignment.dates_changed": {
    courseId: string;
    courseCode: string;
    assignmentId: string;
    title: string;
    dueAt: string | null;
    lateUntil: string | null;
  };
  /** Son tarihe 24 saat kaldı (teslim etmemiş öğrencilere). */
  "assignment.due_soon": { courseId: string; courseCode: string; assignmentId: string; title: string; dueAt: string };
  /** Puan yayınlandı. */
  "submission.score_published": { courseId: string; courseCode: string; assignmentId: string; title: string };
  /** Eğitmene günlük özet: "X ödevine N yeni teslim". */
  "instructor.daily_digest": { items: { assignmentId: string; title: string; courseCode: string; newSubmissions: number }[] };
};

export type NotificationType = keyof NotificationPayloads;

/**
 * Kullanıcılara bildirim yazar (toplu insert). Kullanıcı listesi boşsa hiçbir şey yapmaz.
 * Bir transaction içindeyseniz `tx` geçirin; böylece bildirim, asıl değişiklikle birlikte commit olur.
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
  return inserted;
}

/** Okunmamış bildirim sayısı (üst bardaki zil rozeti). */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

/** Son bildirimler (en yeni üstte). */
export async function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Bildirimleri okundu işaretler. `ids` verilmezse kullanıcının tümü.
 * Kullanıcı kimliği her zaman koşula eklenir; başkasının bildirimi işaretlenemez.
 */
export async function markNotificationsRead(userId: string, ids?: readonly string[]): Promise<void> {
  const conditions = [eq(notifications.userId, userId), isNull(notifications.readAt)];
  if (ids && ids.length > 0) conditions.push(inArray(notifications.id, [...ids]));
  if (ids && ids.length === 0) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions));
}
