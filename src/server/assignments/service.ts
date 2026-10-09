import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db, type DbOrTx } from "@/db";
import {
  assignments,
  courseRoster,
  courses,
  submissionHistory,
  submissions,
  users,
  type Course,
  type LinkItem,
} from "@/db/schema";
import type { Page } from "@/lib/page";
import { audit } from "@/lib/server/audit";
import { decrypt, decryptNullable } from "@/lib/server/crypto";
import { notify } from "@/lib/server/notifications";
import { consume, rateLimitKey } from "@/lib/server/rate-limit";
import { ARCHIVED, NO_ACCESS, clampPage, requireOwnedCourse, type Actor } from "@/server/courses/service";

import {
  getSubmissionWindow,
  isAllowedSubmissionHost,
  isLateAt,
  toIstanbulLocalInput,
  type SubmissionWindow,
} from "./rules";
import type { GradeSubmissionInput, PublishScoresInput, SaveAssignmentInput, SubmitAssignmentInput } from "./schemas";

/**
 * Assignment business logic (docs/fazlar/F4-odev-teslim.md). Actions and queries stay thin and
 * pass an explicit actor, so everything here is testable against the database.
 */

/** Expected, user-facing failure (message is Turkish and shown as is). */
export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = "Ödev bulunamadı.";
const SUBMISSION_NOT_FOUND = "Teslim bulunamadı.";
export const SUBMISSION_CLOSED = "Teslim süresi doldu.";
export const SCORE_PUBLISHED_LOCKED = "Puanınız yayınlandı, teslim artık değiştirilemez.";
export const DRIVE_ONLY = "Lütfen bir Google Drive bağlantısı yapıştırın.";
export const INVALID_LINK = "Geçerli bir bağlantı girin.";
export const LINK_CHECK_LIMIT = { limit: 20, windowSec: 60 } as const;

/* ───────────────────────────── shared lookups ───────────────────────────── */

type OwnedAssignment = {
  assignment: typeof assignments.$inferSelect;
  course: Course;
};

/** The assignment with its course if the course belongs to the instructor, else null. */
export async function findOwnedAssignment(
  assignmentId: string,
  instructorId: string,
  executor: DbOrTx = db,
): Promise<OwnedAssignment | null> {
  if (!UUID.test(assignmentId)) return null;
  const [row] = await executor
    .select({ assignment: assignments, course: courses })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(and(eq(assignments.id, assignmentId), eq(courses.instructorId, instructorId)))
    .limit(1);
  return row ?? null;
}

async function requireOwnedAssignment(assignmentId: string, actor: Actor, allowArchived = false) {
  const owned = await findOwnedAssignment(assignmentId, actor.id);
  if (!owned) throw new AssignmentError(NO_ACCESS);
  if (owned.course.archivedAt && !allowArchived) throw new AssignmentError(ARCHIVED);
  return owned;
}

/** Active students linked in the course roster. */
async function rosterStudentIds(executor: DbOrTx, courseId: string): Promise<string[]> {
  const rows = await executor
    .select({ id: users.id })
    .from(courseRoster)
    .innerJoin(users, eq(users.id, courseRoster.userId))
    .where(and(eq(courseRoster.courseId, courseId), eq(users.status, "active")));
  return rows.map((r) => r.id);
}

const sameTime = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

/* ───────────────────────────── instructor writes ───────────────────────────── */

export async function saveAssignment(
  actor: Actor,
  input: SaveAssignmentInput,
): Promise<{ id: string; status: "draft" | "published" }> {
  const course = await requireOwnedCourse(input.courseId, actor);

  const lateAllowed = input.lateAllowed && !!input.dueAt;
  const penaltyType = lateAllowed ? input.latePenaltyType : "none";
  const values = {
    title: input.title,
    bodyMd: input.bodyMd,
    links: input.links as LinkItem[],
    submissionType: input.submissionType,
    allowAnyLink: input.allowAnyLink,
    dueAt: input.dueAt ?? null,
    lateAllowed,
    lateUntil: lateAllowed ? (input.lateUntil ?? null) : null,
    latePenaltyType: penaltyType,
    latePenaltyValue: penaltyType === "none" ? null : (input.latePenaltyValue ?? null),
    maxScore: input.grading ? (input.maxScore ?? null) : null,
  };

  return db.transaction(async (tx) => {
    const now = new Date();

    if (!input.id) {
      const publish = input.intent === "publish";
      const [row] = await tx
        .insert(assignments)
        .values({
          ...values,
          courseId: course.id,
          authorId: actor.id,
          status: publish ? "published" : "draft",
          publishedAt: publish ? now : null,
        })
        .returning({ id: assignments.id });
      if (publish) await notifyPublished(tx, course, row!.id, values.title, values.dueAt);
      return { id: row!.id, status: publish ? ("published" as const) : ("draft" as const) };
    }

    const [existing] = await tx
      .select()
      .from(assignments)
      .where(and(eq(assignments.id, input.id), eq(assignments.courseId, course.id)))
      .for("update");
    if (!existing) throw new AssignmentError(NOT_FOUND);

    if (values.maxScore !== null) {
      const [top] = await tx
        .select({ top: sql<number | null>`max(${submissions.score})::float8` })
        .from(submissions)
        .where(eq(submissions.assignmentId, existing.id));
      if (top?.top != null && top.top > values.maxScore) {
        throw new AssignmentError("Maksimum puan, verilmiş puanlardan küçük olamaz.");
      }
    }

    const firstPublish = existing.status === "draft" && input.intent === "publish";
    await tx
      .update(assignments)
      .set({
        ...values,
        ...(firstPublish ? { status: "published" as const, publishedAt: now } : {}),
      })
      .where(eq(assignments.id, existing.id));

    if (firstPublish) {
      await notifyPublished(tx, course, existing.id, values.title, values.dueAt);
    } else if (existing.status === "published") {
      const datesChanged =
        !sameTime(existing.dueAt, values.dueAt) ||
        existing.lateAllowed !== values.lateAllowed ||
        !sameTime(existing.lateUntil, values.lateUntil);
      if (datesChanged) {
        // existing submissions keep their isLate value (decided at submission time)
        await tx.update(assignments).set({ dueReminderSentAt: null }).where(eq(assignments.id, existing.id));
        await notify(
          await rosterStudentIds(tx, course.id),
          "assignment.dates_changed",
          {
            courseId: course.id,
            courseCode: course.code,
            assignmentId: existing.id,
            title: values.title,
            dueAt: values.dueAt?.toISOString() ?? null,
            lateUntil: values.lateUntil?.toISOString() ?? null,
          },
          tx,
        );
        await audit(actor.id, "assignment.dates_change", { type: "assignment", id: existing.id }, {}, tx);
      }
    }
    return { id: existing.id, status: firstPublish || existing.status === "published" ? "published" : "draft" };
  });
}

async function notifyPublished(tx: DbOrTx, course: Course, assignmentId: string, title: string, dueAt: Date | null) {
  await notify(
    await rosterStudentIds(tx, course.id),
    "assignment.published",
    { courseId: course.id, courseCode: course.code, assignmentId, title, dueAt: dueAt?.toISOString() ?? null },
    tx,
  );
}

export async function deleteAssignment(actor: Actor, input: { id: string }): Promise<void> {
  const { assignment } = await requireOwnedAssignment(input.id, actor);
  await db.delete(assignments).where(eq(assignments.id, assignment.id));
}

export async function gradeSubmission(
  actor: Actor,
  input: GradeSubmissionInput,
): Promise<{ score: number | null; gradedAt: Date | null }> {
  if (!UUID.test(input.submissionId)) throw new AssignmentError(SUBMISSION_NOT_FOUND);
  const [row] = await db
    .select({ submission: submissions, assignment: assignments, course: courses })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(and(eq(submissions.id, input.submissionId), eq(courses.instructorId, actor.id)))
    .limit(1);
  if (!row) throw new AssignmentError(NO_ACCESS);
  if (row.course.archivedAt) throw new AssignmentError(ARCHIVED);

  const maxScore = row.assignment.maxScore;
  if (maxScore === null) throw new AssignmentError("Bu ödev puanlanmıyor.");
  if (input.score !== null && (input.score < 0 || input.score > maxScore)) {
    throw new AssignmentError(`Puan 0 ile ${maxScore} arasında olmalı.`);
  }

  // scorePublishedAt is left untouched: a published score is updated in place
  const gradedAt = input.score === null ? null : new Date();
  await db
    .update(submissions)
    .set({ score: input.score, feedback: input.feedback, gradedAt, gradedById: input.score === null ? null : actor.id })
    .where(eq(submissions.id, row.submission.id));
  return { score: input.score, gradedAt };
}

export async function publishScores(actor: Actor, input: PublishScoresInput): Promise<{ count: number }> {
  const { assignment, course } = await requireOwnedAssignment(input.assignmentId, actor);

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({ scorePublishedAt: new Date() })
      .where(
        and(
          eq(submissions.assignmentId, assignment.id),
          isNotNull(submissions.score),
          isNull(submissions.scorePublishedAt),
          input.submissionIds ? inArray(submissions.id, input.submissionIds) : undefined,
        ),
      )
      .returning({ studentId: submissions.studentId });
    if (updated.length === 0) return { count: 0 };

    await notify(
      updated.map((r) => r.studentId),
      "submission.score_published",
      { courseId: course.id, courseCode: course.code, assignmentId: assignment.id, title: assignment.title },
      tx,
    );
    await audit(actor.id, "submission.score_publish", { type: "assignment", id: assignment.id }, { count: updated.length }, tx);
    return { count: updated.length };
  });
}

/* ───────────────────────────── instructor reads ───────────────────────────── */

export type AssignmentSummary = {
  id: string;
  title: string;
  status: "draft" | "published";
  submissionType: "link" | "none";
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
  maxScore: number | null;
  counts: { roster: number; submitted: number; late: number; graded: number; published: number };
};

export type AssignmentDetail = AssignmentSummary & {
  bodyMd: string;
  links: { title: string; url: string }[];
  allowAnyLink: boolean;
  latePenaltyType: "none" | "points" | "percent";
  latePenaltyValue: number | null;
  publishedAt: Date | null;
  course: { id: string; code: string; name: string; archivedAt: Date | null };
};

// Correlated subqueries reference the outer table by name: Drizzle drops the table prefix in single-table selects.
const countSql = (extra: ReturnType<typeof sql>) =>
  sql<number>`(select count(*)::int from ${submissions} where ${submissions.assignmentId} = "assignments"."id" ${extra})`;

const summaryColumns = {
  id: assignments.id,
  title: assignments.title,
  status: assignments.status,
  submissionType: assignments.submissionType,
  dueAt: assignments.dueAt,
  lateAllowed: assignments.lateAllowed,
  lateUntil: assignments.lateUntil,
  maxScore: assignments.maxScore,
  roster: sql<number>`(select count(*)::int from ${courseRoster} where ${courseRoster.courseId} = "assignments"."course_id")`,
  submitted: countSql(sql``),
  late: countSql(sql`and ${submissions.isLate}`),
  graded: countSql(sql`and ${submissions.score} is not null`),
  published: countSql(sql`and ${submissions.scorePublishedAt} is not null`),
};

type SummaryRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  submissionType: "link" | "none";
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
  maxScore: number | null;
  roster: number;
  submitted: number;
  late: number;
  graded: number;
  published: number;
};

function toSummary(r: SummaryRow): AssignmentSummary {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    submissionType: r.submissionType,
    dueAt: r.dueAt,
    lateAllowed: r.lateAllowed,
    lateUntil: r.lateUntil,
    maxScore: r.maxScore,
    counts: { roster: r.roster, submitted: r.submitted, late: r.late, graded: r.graded, published: r.published },
  };
}

export async function listAssignmentSummaries(courseId: string): Promise<AssignmentSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(assignments)
    .where(eq(assignments.courseId, courseId))
    // drafts first (enum order), then nearest deadline, no deadline last
    .orderBy(asc(assignments.status), sql`${assignments.dueAt} asc nulls last`, desc(assignments.createdAt));
  return rows.map(toSummary);
}

export async function getAssignmentDetail(assignmentId: string, instructorId: string): Promise<AssignmentDetail | null> {
  if (!UUID.test(assignmentId)) return null;
  const [row] = await db
    .select({
      ...summaryColumns,
      bodyMd: assignments.bodyMd,
      links: assignments.links,
      allowAnyLink: assignments.allowAnyLink,
      latePenaltyType: assignments.latePenaltyType,
      latePenaltyValue: assignments.latePenaltyValue,
      publishedAt: assignments.publishedAt,
      courseId: courses.id,
      courseCode: courses.code,
      courseName: courses.name,
      courseArchivedAt: courses.archivedAt,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(and(eq(assignments.id, assignmentId), eq(courses.instructorId, instructorId)))
    .limit(1);
  if (!row) return null;
  return {
    ...toSummary(row),
    bodyMd: row.bodyMd,
    links: row.links,
    allowAnyLink: row.allowAnyLink,
    latePenaltyType: row.latePenaltyType,
    latePenaltyValue: row.latePenaltyValue,
    publishedAt: row.publishedAt,
    course: { id: row.courseId, code: row.courseCode, name: row.courseName, archivedAt: row.courseArchivedAt },
  };
}

export type SubmissionRow = {
  rosterId: string;
  studentNo: string;
  displayName: string | null;
  registered: boolean;
  submission: null | {
    id: string;
    url: string;
    submittedAt: Date;
    isLate: boolean;
    score: number | null;
    feedback: string | null;
    gradedAt: Date | null;
    scorePublishedAt: Date | null;
    historyCount: number;
  };
};

export type SubmissionFilter = "ungraded" | "missing" | "late" | "all";

/** Whole roster of the assignment's course joined with submissions, ordered by student number. */
export async function loadSubmissionRows(assignmentId: string, courseId: string): Promise<SubmissionRow[]> {
  const [rosterRows, subRows, historyCounts] = await Promise.all([
    db.select().from(courseRoster).where(eq(courseRoster.courseId, courseId)),
    db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId)),
    db
      .select({ submissionId: submissionHistory.submissionId, n: sql<number>`count(*)::int` })
      .from(submissionHistory)
      .innerJoin(submissions, eq(submissions.id, submissionHistory.submissionId))
      .where(eq(submissions.assignmentId, assignmentId))
      .groupBy(submissionHistory.submissionId),
  ]);
  const byStudent = new Map(subRows.map((s) => [s.studentId, s]));
  const historyBySubmission = new Map(historyCounts.map((h) => [h.submissionId, h.n]));

  const rows: SubmissionRow[] = rosterRows.map((r) => {
    const s = r.userId ? byStudent.get(r.userId) : undefined;
    return {
      rosterId: r.id,
      studentNo: decrypt(r.studentNoEnc),
      displayName: decryptNullable(r.displayNameEnc),
      registered: r.userId !== null,
      submission: s
        ? {
            id: s.id,
            url: s.url,
            submittedAt: s.submittedAt,
            isLate: s.isLate,
            score: s.score,
            feedback: s.feedback,
            gradedAt: s.gradedAt,
            scorePublishedAt: s.scorePublishedAt,
            historyCount: historyBySubmission.get(s.id) ?? 1,
          }
        : null,
    };
  });
  rows.sort((a, b) => a.studentNo.localeCompare(b.studentNo, "en", { numeric: true }));
  return rows;
}

export async function listSubmissionRows(
  assignmentId: string,
  courseId: string,
  o: { filter?: SubmissionFilter; page?: number },
): Promise<Page<SubmissionRow>> {
  const all = await loadSubmissionRows(assignmentId, courseId);
  const filtered = all.filter((r) => {
    switch (o.filter) {
      case "ungraded":
        return r.submission !== null && r.submission.score === null;
      case "missing":
        return r.submission === null;
      case "late":
        return r.submission?.isLate === true;
      default:
        return true;
    }
  });
  const { page, pageSize } = clampPage(o.page, 100);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
}

export async function listSubmissionHistory(
  submissionId: string,
  instructorId: string,
): Promise<Array<{ url: string; submittedAt: Date; isLate: boolean }> | null> {
  if (!UUID.test(submissionId)) return null;
  const [owned] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(and(eq(submissions.id, submissionId), eq(courses.instructorId, instructorId)))
    .limit(1);
  if (!owned) return null;
  return db
    .select({ url: submissionHistory.url, submittedAt: submissionHistory.submittedAt, isLate: submissionHistory.isLate })
    .from(submissionHistory)
    .where(eq(submissionHistory.submissionId, submissionId))
    .orderBy(desc(submissionHistory.submittedAt));
}

/* ───────────────────────────── CSV ───────────────────────────── */

function csvCell(value: string, isText = true): string {
  let v = value;
  // spreadsheet formula injection guard for free text
  if (isText && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function formatIstanbul(d: Date): string {
  const [date, time] = toIstanbulLocalInput(d).split("T") as [string, string];
  const [y, m, day] = date.split("-");
  return `${day}.${m}.${y} ${time}`;
}

const TR_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function slugify(value: string): string {
  const slug = value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (ch) => TR_ASCII[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "odev";
}

const decimal = (n: number) => String(n).replace(".", ",");

/** CSV (UTF-8 BOM, ";" separated) for the owner, or null when the assignment is not theirs. */
export async function buildSubmissionsCsv(
  assignmentId: string,
  instructorId: string,
): Promise<{ filename: string; content: string } | null> {
  const owned = await findOwnedAssignment(assignmentId, instructorId);
  if (!owned) return null;
  const { assignment, course } = owned;
  const rows = await loadSubmissionRows(assignment.id, course.id);

  const header = [
    "Numara",
    "Ad Soyad",
    "Durum",
    "Teslim zamanı",
    "Link",
    "Puan",
    "Geri bildirim",
    "Puan yayında",
  ];
  const lines = [header.map((h) => csvCell(h, false)).join(";")];
  for (const r of rows) {
    const s = r.submission;
    const status = s ? (s.isLate ? "Geç teslim" : "Teslim etti") : r.registered ? "Teslim etmedi" : "Kayıt olmadı";
    lines.push(
      [
        csvCell(r.studentNo),
        csvCell(r.displayName ?? ""),
        csvCell(status, false),
        s ? formatIstanbul(s.submittedAt) : "",
        csvCell(s?.url ?? ""),
        s && s.score !== null ? decimal(s.score) : "",
        csvCell(s?.feedback ?? ""),
        s ? (s.scorePublishedAt ? "Evet" : "Hayır") : "",
      ].join(";"),
    );
  }
  return {
    filename: `${slugify(course.code).toUpperCase()}-${slugify(assignment.title)}-teslimler.csv`,
    content: `﻿${lines.join("\r\n")}\r\n`,
  };
}

/* ───────────────────────────── student side ───────────────────────────── */

export type StudentAssignmentView = {
  id: string;
  title: string;
  bodyMd: string;
  links: { title: string; url: string }[];
  submissionType: "link" | "none";
  allowAnyLink: boolean;
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
  latePenaltyType: "none" | "points" | "percent";
  latePenaltyValue: number | null;
  maxScore: number | null;
  course: { id: string; code: string; name: string; archived: boolean };
  window: SubmissionWindow;
  submission: null | {
    url: string;
    submittedAt: Date;
    isLate: boolean;
    history: Array<{ url: string; submittedAt: Date; isLate: boolean }>;
    result: null | { score: number | null; maxScore: number | null; feedback: string | null };
  };
};

/** Published assignment of a course the student is rostered in, else null. */
async function findStudentAssignment(assignmentId: string, studentId: string, executor: DbOrTx = db) {
  if (!UUID.test(assignmentId)) return null;
  const [row] = await executor
    .select({ assignment: assignments, course: courses })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(courseRoster, and(eq(courseRoster.courseId, courses.id), eq(courseRoster.userId, studentId)))
    .where(and(eq(assignments.id, assignmentId), eq(assignments.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function getStudentAssignmentView(
  assignmentId: string,
  studentId: string,
  now: Date = new Date(),
): Promise<StudentAssignmentView | null> {
  const found = await findStudentAssignment(assignmentId, studentId);
  if (!found) return null;
  const { assignment: a, course } = found;

  const [sub] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, a.id), eq(submissions.studentId, studentId)))
    .limit(1);
  const history = sub
    ? await db
        .select({
          url: submissionHistory.url,
          submittedAt: submissionHistory.submittedAt,
          isLate: submissionHistory.isLate,
        })
        .from(submissionHistory)
        .where(eq(submissionHistory.submissionId, sub.id))
        .orderBy(desc(submissionHistory.submittedAt))
    : [];

  return {
    id: a.id,
    title: a.title,
    bodyMd: a.bodyMd,
    links: a.links,
    submissionType: a.submissionType,
    allowAnyLink: a.allowAnyLink,
    dueAt: a.dueAt,
    lateAllowed: a.lateAllowed,
    lateUntil: a.lateUntil,
    latePenaltyType: a.latePenaltyType,
    latePenaltyValue: a.latePenaltyValue,
    maxScore: a.maxScore,
    course: { id: course.id, code: course.code, name: course.name, archived: course.archivedAt !== null },
    window: getSubmissionWindow(a, now, course.archivedAt !== null),
    submission: sub
      ? {
          url: sub.url,
          submittedAt: sub.submittedAt,
          isLate: sub.isLate,
          history,
          result: sub.scorePublishedAt
            ? { score: sub.score, maxScore: a.maxScore, feedback: sub.feedback }
            : null,
        }
      : null,
  };
}

export async function submitAssignment(
  student: { id: string },
  input: SubmitAssignmentInput,
  now: Date = new Date(),
): Promise<{ submittedAt: Date; isLate: boolean }> {
  const found = await findStudentAssignment(input.assignmentId, student.id);
  if (!found) throw new AssignmentError(NOT_FOUND);
  const { assignment: a, course } = found;

  const window = getSubmissionWindow(a, now, course.archivedAt !== null);
  if (window.state === "no_submission") throw new AssignmentError("Bu ödev için teslim gerekmiyor.");
  if (window.state === "closed") throw new AssignmentError(SUBMISSION_CLOSED);

  let parsed: URL | null = null;
  try {
    parsed = new URL(input.url);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) throw new AssignmentError(INVALID_LINK);
  if (!isAllowedSubmissionHost(input.url, a.allowAnyLink)) throw new AssignmentError(DRIVE_ONLY);

  const isLate = isLateAt(a, now);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(submissions)
      .values({ assignmentId: a.id, studentId: student.id, url: input.url, submittedAt: now, isLate })
      .onConflictDoUpdate({
        target: [submissions.assignmentId, submissions.studentId],
        set: { url: input.url, submittedAt: now, isLate, updatedAt: now },
        // a published score locks the submission
        setWhere: isNull(submissions.scorePublishedAt),
      })
      .returning({ id: submissions.id });
    if (!row) throw new AssignmentError(SCORE_PUBLISHED_LOCKED);
    await tx.insert(submissionHistory).values({ submissionId: row.id, url: input.url, submittedAt: now, isLate });
    return { submittedAt: now, isLate };
  });
}

/* ───────────────────────────── link access check ───────────────────────────── */

export type LinkAccess = "public" | "private" | "unknown";

const CHECK_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
const MAX_REDIRECTS = 2;

/**
 * Anonymous reachability probe for a Drive/Docs link. Only allowlisted hosts are contacted,
 * redirects are followed manually (at most 2) and never leave the allowlist. Never throws.
 */
export async function probeLinkAccess(url: string): Promise<LinkAccess> {
  try {
    let current = new URL(url);
    for (let step = 0; step <= MAX_REDIRECTS; step++) {
      if (current.protocol !== "https:" || !CHECK_HOSTS.has(current.hostname.toLowerCase())) return "unknown";
      const res = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        credentials: "omit",
        headers: {},
      });
      if (res.status >= 200 && res.status < 300) return "public";
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return "unknown";
        const next = new URL(location, current);
        if (next.hostname.toLowerCase() === "accounts.google.com") return "private";
        current = next;
        continue;
      }
      return "unknown";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function checkSubmissionLink(studentId: string, url: string): Promise<LinkAccess> {
  const rl = await consume(rateLimitKey("linkcheck", studentId), LINK_CHECK_LIMIT);
  if (!rl.ok) return "unknown";
  return probeLinkAccess(url);
}
