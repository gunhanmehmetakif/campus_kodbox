import "server-only";

import { and, eq, gt, isNotNull, isNull, lt, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  assignments,
  auditLogs,
  courseRoster,
  courses,
  emailTokens,
  notifications,
  sessions,
  submissions,
  users,
} from "@/db/schema";
import { notify } from "@/lib/server/notifications";
import { purgeExpiredRateLimits } from "@/lib/server/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;
export const READ_NOTIFICATION_RETENTION_DAYS = 90;
export const AUDIT_LOG_RETENTION_DAYS = 2 * 365;
export const EMAIL_TOKEN_RETENTION_DAYS = 7;

export type CleanupResult = {
  rateLimits: number;
  sessions: number;
  notifications: number;
  auditLogs: number;
  emailTokens: number;
};

/**
 * 24 hour reminders (docs/fazlar/F5-F6-ogrenci-bildirim.md 3.4). Each assignment is claimed
 * atomically (`due_reminder_sent_at`), so overlapping runs never notify twice.
 */
export async function runDueReminders(now: Date): Promise<{ assignments: number; students: number }> {
  const candidates = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      courseId: courses.id,
      courseCode: courses.code,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(
      and(
        eq(assignments.status, "published"),
        eq(assignments.submissionType, "link"),
        isNull(courses.archivedAt),
        gt(assignments.dueAt, now),
        lte(assignments.dueAt, new Date(now.getTime() + DAY_MS)),
        isNull(assignments.dueReminderSentAt),
      ),
    );

  let assignmentCount = 0;
  let studentCount = 0;

  for (const candidate of candidates) {
    if (!candidate.dueAt) continue;
    const dueAt = candidate.dueAt;
    // Claim and notify in one transaction: a failed notify releases the claim for the next run.
    const notified = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(assignments)
        .set({ dueReminderSentAt: now })
        .where(and(eq(assignments.id, candidate.id), isNull(assignments.dueReminderSentAt)))
        .returning({ id: assignments.id });
      if (claimed.length === 0) return null;

      const recipients = await tx
        .select({ userId: users.id })
        .from(courseRoster)
        .innerJoin(users, eq(users.id, courseRoster.userId))
        .leftJoin(
          submissions,
          and(eq(submissions.assignmentId, candidate.id), eq(submissions.studentId, users.id)),
        )
        .where(
          and(
            eq(courseRoster.courseId, candidate.courseId),
            isNotNull(courseRoster.userId),
            eq(users.status, "active"),
            isNull(submissions.id),
          ),
        );

      const ids = recipients.map((r) => r.userId);
      await notify(
        ids,
        "assignment.due_soon",
        {
          courseId: candidate.courseId,
          courseCode: candidate.courseCode,
          assignmentId: candidate.id,
          title: candidate.title,
          dueAt: dueAt.toISOString(),
        },
        tx,
      );
      return ids.length;
    });

    if (notified === null) continue;
    assignmentCount += 1;
    studentCount += notified;
  }

  return { assignments: assignmentCount, students: studentCount };
}

/**
 * Housekeeping, aligned with docs/KVKK-aydinlatma.md 6: expired rate limit counters and sessions,
 * read notifications older than 90 days, audit logs older than 2 years, and email tokens that
 * expired or were used more than 7 days ago.
 */
export async function runCleanup(now: Date): Promise<CleanupResult> {
  const rateLimits = await purgeExpiredRateLimits();
  const expiredSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  const notificationCutoff = new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * DAY_MS);
  const oldNotifications = await db
    .delete(notifications)
    .where(and(isNotNull(notifications.readAt), lt(notifications.readAt, notificationCutoff)))
    .returning({ id: notifications.id });
  const auditCutoff = new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * DAY_MS);
  const oldAuditLogs = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, auditCutoff))
    .returning({ id: auditLogs.id });
  const tokenCutoff = new Date(now.getTime() - EMAIL_TOKEN_RETENTION_DAYS * DAY_MS);
  const oldTokens = await db
    .delete(emailTokens)
    .where(or(lt(emailTokens.expiresAt, tokenCutoff), and(isNotNull(emailTokens.usedAt), lt(emailTokens.usedAt, tokenCutoff))))
    .returning({ id: emailTokens.id });
  return {
    rateLimits,
    sessions: expiredSessions.length,
    notifications: oldNotifications.length,
    auditLogs: oldAuditLogs.length,
    emailTokens: oldTokens.length,
  };
}
