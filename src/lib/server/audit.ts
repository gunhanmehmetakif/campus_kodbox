import "server-only";

import { db, type DbOrTx } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * Audit log. Critical actions (account create/disable, password reset, role/school/term
 * changes, bulk archive, score publishing) are recorded.
 *
 * - Never put plaintext email / student no in `metadata`; use ids or maskEmail/maskStudentNo.
 * - Inside a transaction pass `tx`, so a rollback also drops the record.
 *
 * @example await audit(admin.id, "instructor.create", { type: "user", id: newUser.id }, { displayName })
 */
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_change"
  | "auth.password_reset"
  | "auth.oauth_link"
  | "auth.oauth_unlink"
  | "user.register"
  | "instructor.create"
  | "instructor.update"
  | "instructor.password_reset"
  | "user.disable"
  | "user.enable"
  | "school.update"
  | "term.create"
  | "term.update"
  | "term.activate"
  | "term.archive_courses"
  | "course.create"
  | "course.update"
  | "course.archive"
  | "course.unarchive"
  | "course.delete"
  | "roster.add"
  | "roster.remove"
  | "assignment.dates_change"
  | "submission.score_publish"
  | "seed.run";

export type AuditTarget = { type: string; id: string | null };

export async function audit(
  actorId: string | null,
  action: AuditAction,
  target?: AuditTarget | null,
  metadata: Record<string, unknown> = {},
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(auditLogs).values({
    actorId,
    action,
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    metadata,
  });
}
