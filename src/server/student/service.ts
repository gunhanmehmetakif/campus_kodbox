import "server-only";

import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { assignments, courseRoster, courses, posts, submissions, terms, users } from "@/db/schema";
import type { Page } from "@/lib/page";
import { getSubmissionWindow, type SubmissionWindow } from "@/server/assignments/rules";
import { clampPage } from "@/server/courses/service";

/**
 * Student-side reads (docs/fazlar/F5-F6-ogrenci-bildirim.md section 1). Every function takes the
 * student's user id and `now` explicitly so it is testable against the database. A student's
 * courses are exactly the `course_roster` rows linked to them; only published content is read.
 */

export type { Page, SubmissionWindow };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UPCOMING_LIMIT = 20;
const ANNOUNCEMENT_LIMIT = 5;
const FEED_PAGE_SIZE = 20;
const ASSIGNMENT_LIST_LIMIT = 200;

export type StudentCourseCard = {
  id: string;
  code: string;
  name: string;
  termName: string;
  instructorName: string | null;
  pendingCount: number;
  archived: boolean;
};

export type UpcomingItem = {
  assignmentId: string;
  title: string;
  course: { id: string; code: string };
  dueAt: Date | null;
  lateUntil: Date | null;
  state: "open" | "late";
};

export type AnnouncementItem = {
  id: string;
  title: string;
  course: { id: string; code: string };
  publishedAt: Date;
};

export type StudentDashboard = {
  upcoming: UpcomingItem[];
  courses: StudentCourseCard[];
  announcements: AnnouncementItem[];
  pastCourseCount: number;
};

export type StudentCourseView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  termName: string;
  instructorName: string | null;
  archived: boolean;
};

export type FeedItem =
  | {
      kind: "post";
      id: string;
      postType: "announcement" | "material";
      title: string;
      bodyMd: string;
      links: { title: string; url: string }[];
      publishedAt: Date;
    }
  | { kind: "assignment"; id: string; title: string; dueAt: Date | null; publishedAt: Date };

export type StudentAssignmentListItem = {
  id: string;
  title: string;
  submissionType: "link" | "none";
  dueAt: Date | null;
  lateUntil: Date | null;
  window: SubmissionWindow;
  submittedAt: Date | null;
  isLate: boolean;
  result: { score: number | null; maxScore: number | null } | null;
};

/* ───────────────────────────── shared pieces ───────────────────────────── */

/** Published, link-type assignment whose window is open or late at `now` (course not archived is checked by callers). */
function windowOpenCondition(now: Date) {
  return and(
    eq(assignments.status, "published"),
    eq(assignments.submissionType, "link"),
    or(
      isNull(assignments.dueAt),
      gt(assignments.dueAt, now),
      and(
        eq(assignments.lateAllowed, true),
        or(isNull(assignments.lateUntil), gt(assignments.lateUntil, now)),
      ),
    ),
  );
}

/** The student has not submitted: LEFT JOIN submissions then submissions.id IS NULL. */
const notSubmitted = isNull(submissions.id);

function joinMySubmission(userId: string) {
  return and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, userId));
}

async function listCourseCards(userId: string, now: Date, archived: boolean): Promise<StudentCourseCard[]> {
  const rows = await db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      termName: terms.name,
      instructorName: users.displayName,
      archivedAt: courses.archivedAt,
    })
    .from(courseRoster)
    .innerJoin(courses, eq(courses.id, courseRoster.courseId))
    .innerJoin(terms, eq(terms.id, courses.termId))
    .innerJoin(users, eq(users.id, courses.instructorId))
    .where(and(eq(courseRoster.userId, userId), archived ? isNotNull(courses.archivedAt) : isNull(courses.archivedAt)))
    .orderBy(archived ? desc(courses.archivedAt) : asc(courses.code), asc(courses.id));

  const pending = new Map<string, number>();
  if (!archived && rows.length > 0) {
    const counts = await db
      .select({ courseId: assignments.courseId, n: count() })
      .from(assignments)
      .leftJoin(submissions, joinMySubmission(userId))
      .where(
        and(
          inArray(
            assignments.courseId,
            rows.map((r) => r.id),
          ),
          windowOpenCondition(now),
          notSubmitted,
        ),
      )
      .groupBy(assignments.courseId);
    for (const c of counts) pending.set(c.courseId, c.n);
  }

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    termName: r.termName,
    instructorName: r.instructorName,
    pendingCount: pending.get(r.id) ?? 0,
    archived: r.archivedAt !== null,
  }));
}

/* ───────────────────────────── dashboard ───────────────────────────── */

export async function getDashboard(userId: string, now: Date): Promise<StudentDashboard> {
  const [upcomingRows, activeCourses, announcementRows, [archivedCount]] = await Promise.all([
    db
      .select({
        assignmentId: assignments.id,
        title: assignments.title,
        courseId: courses.id,
        courseCode: courses.code,
        dueAt: assignments.dueAt,
        lateAllowed: assignments.lateAllowed,
        lateUntil: assignments.lateUntil,
      })
      .from(courseRoster)
      .innerJoin(courses, eq(courses.id, courseRoster.courseId))
      .innerJoin(assignments, eq(assignments.courseId, courses.id))
      .leftJoin(submissions, joinMySubmission(userId))
      .where(and(eq(courseRoster.userId, userId), isNull(courses.archivedAt), windowOpenCondition(now), notSubmitted))
      .orderBy(sql`${assignments.dueAt} asc nulls last`, asc(assignments.id))
      .limit(UPCOMING_LIMIT),
    listCourseCards(userId, now, false),
    db
      .select({
        id: posts.id,
        title: posts.title,
        courseId: courses.id,
        courseCode: courses.code,
        publishedAt: posts.publishedAt,
      })
      .from(courseRoster)
      .innerJoin(courses, eq(courses.id, courseRoster.courseId))
      .innerJoin(posts, eq(posts.courseId, courses.id))
      .where(
        and(
          eq(courseRoster.userId, userId),
          isNull(courses.archivedAt),
          eq(posts.status, "published"),
          eq(posts.type, "announcement"),
          isNotNull(posts.publishedAt),
        ),
      )
      .orderBy(desc(posts.publishedAt), asc(posts.id))
      .limit(ANNOUNCEMENT_LIMIT),
    db
      .select({ n: count() })
      .from(courseRoster)
      .innerJoin(courses, eq(courses.id, courseRoster.courseId))
      .where(and(eq(courseRoster.userId, userId), isNotNull(courses.archivedAt))),
  ]);

  const upcoming: UpcomingItem[] = [];
  for (const r of upcomingRows) {
    const window = getSubmissionWindow(
      { submissionType: "link", dueAt: r.dueAt, lateAllowed: r.lateAllowed, lateUntil: r.lateUntil },
      now,
      false,
    );
    if (window.state !== "open" && window.state !== "late") continue;
    upcoming.push({
      assignmentId: r.assignmentId,
      title: r.title,
      course: { id: r.courseId, code: r.courseCode },
      dueAt: r.dueAt,
      lateUntil: r.lateUntil,
      state: window.state,
    });
  }

  return {
    upcoming,
    courses: activeCourses,
    announcements: announcementRows.map((r) => ({
      id: r.id,
      title: r.title,
      course: { id: r.courseId, code: r.courseCode },
      publishedAt: r.publishedAt as Date,
    })),
    pastCourseCount: archivedCount?.n ?? 0,
  };
}

export function listPastCourseCards(userId: string, now: Date): Promise<StudentCourseCard[]> {
  return listCourseCards(userId, now, true);
}

/* ───────────────────────────── course ───────────────────────────── */

/** The course if the student is on its roster, else null. */
export async function findStudentCourse(courseId: string, userId: string): Promise<StudentCourseView | null> {
  if (!UUID.test(courseId)) return null;
  const [row] = await db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      description: courses.description,
      termName: terms.name,
      instructorName: users.displayName,
      archivedAt: courses.archivedAt,
    })
    .from(courseRoster)
    .innerJoin(courses, eq(courses.id, courseRoster.courseId))
    .innerJoin(terms, eq(terms.id, courses.termId))
    .innerJoin(users, eq(users.id, courses.instructorId))
    .where(and(eq(courseRoster.courseId, courseId), eq(courseRoster.userId, userId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    termName: row.termName,
    instructorName: row.instructorName,
    archived: row.archivedAt !== null,
  };
}

export async function listCourseFeed(
  courseId: string,
  userId: string,
  o: { tab: "akis" | "materyaller"; page?: number },
): Promise<Page<FeedItem> | null> {
  if (!(await findStudentCourse(courseId, userId))) return null;
  const { page, pageSize } = clampPage(o.page, FEED_PAGE_SIZE);
  const take = page * pageSize;
  const postWhere = and(
    eq(posts.courseId, courseId),
    eq(posts.status, "published"),
    isNotNull(posts.publishedAt),
    o.tab === "materyaller" ? eq(posts.type, "material") : undefined,
  );
  const assignmentWhere = and(
    eq(assignments.courseId, courseId),
    eq(assignments.status, "published"),
    isNotNull(assignments.publishedAt),
  );

  const [postRows, [postTotal]] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(postWhere)
      .orderBy(desc(posts.publishedAt), asc(posts.id))
      .limit(take),
    db.select({ n: count() }).from(posts).where(postWhere),
  ]);

  const items: FeedItem[] = postRows.map((p) => ({
    kind: "post",
    id: p.id,
    postType: p.type,
    title: p.title,
    bodyMd: p.bodyMd,
    links: p.links,
    publishedAt: p.publishedAt as Date,
  }));
  let total = postTotal?.n ?? 0;

  if (o.tab === "akis") {
    const [assignmentRows, [assignmentTotal]] = await Promise.all([
      db
        .select({
          id: assignments.id,
          title: assignments.title,
          dueAt: assignments.dueAt,
          publishedAt: assignments.publishedAt,
        })
        .from(assignments)
        .where(assignmentWhere)
        .orderBy(desc(assignments.publishedAt), asc(assignments.id))
        .limit(take),
      db.select({ n: count() }).from(assignments).where(assignmentWhere),
    ]);
    for (const a of assignmentRows) {
      items.push({ kind: "assignment", id: a.id, title: a.title, dueAt: a.dueAt, publishedAt: a.publishedAt as Date });
    }
    total += assignmentTotal?.n ?? 0;
  }

  items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || a.id.localeCompare(b.id));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
}

/* ───────────────────────────── assignments ───────────────────────────── */

const WINDOW_RANK: Record<SubmissionWindow["state"], number> = { open: 0, late: 0, no_submission: 2, closed: 3 };

export async function listCourseAssignments(
  courseId: string,
  userId: string,
  now: Date,
  o: { filter: "bekleyen" | "teslim" | "puan" },
): Promise<StudentAssignmentListItem[] | null> {
  const course = await findStudentCourse(courseId, userId);
  if (!course) return null;

  const filterCondition =
    o.filter === "bekleyen"
      ? isNull(submissions.id)
      : o.filter === "teslim"
        ? and(isNotNull(submissions.id), isNull(submissions.scorePublishedAt))
        : isNotNull(submissions.scorePublishedAt);
  const order =
    o.filter === "teslim"
      ? [desc(submissions.submittedAt), asc(assignments.id)]
      : o.filter === "puan"
        ? [desc(submissions.scorePublishedAt), asc(assignments.id)]
        : [asc(assignments.id)];

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      submissionType: assignments.submissionType,
      dueAt: assignments.dueAt,
      lateAllowed: assignments.lateAllowed,
      lateUntil: assignments.lateUntil,
      maxScore: assignments.maxScore,
      submittedAt: submissions.submittedAt,
      isLate: submissions.isLate,
      score: submissions.score,
      scorePublishedAt: submissions.scorePublishedAt,
    })
    .from(assignments)
    .leftJoin(submissions, joinMySubmission(userId))
    .where(and(eq(assignments.courseId, courseId), eq(assignments.status, "published"), filterCondition))
    .orderBy(...order);

  const items = rows.map((r) => {
    const window = getSubmissionWindow(
      { submissionType: r.submissionType, dueAt: r.dueAt, lateAllowed: r.lateAllowed, lateUntil: r.lateUntil },
      now,
      course.archived,
    );
    const item: StudentAssignmentListItem = {
      id: r.id,
      title: r.title,
      submissionType: r.submissionType,
      dueAt: r.dueAt,
      lateUntil: r.lateUntil,
      window,
      submittedAt: r.submittedAt,
      isLate: r.isLate ?? false,
      result: r.scorePublishedAt ? { score: r.score, maxScore: r.maxScore } : null,
    };
    return item;
  });

  if (o.filter === "bekleyen") {
    // open/late by dueAt asc (nulls after), then no_submission, then closed
    const dueKey = (i: StudentAssignmentListItem) => i.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    items.sort((a, b) => {
      const rank = WINDOW_RANK[a.window.state] - WINDOW_RANK[b.window.state];
      if (rank !== 0) return rank;
      const due = dueKey(a) - dueKey(b);
      if (due !== 0 && Number.isFinite(due)) return due;
      if (dueKey(a) !== dueKey(b)) return dueKey(a) === Number.POSITIVE_INFINITY ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
  }
  return items.slice(0, ASSIGNMENT_LIST_LIMIT);
}
