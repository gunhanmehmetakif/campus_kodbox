import "server-only";

import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { assignments, courseRoster, courses, posts, submissions, terms, users } from "@/db/schema";
import type { Page } from "@/lib/page";
import {
  assignmentGroup,
  getSubmissionWindow,
  type AssignmentGroup,
  type SubmissionWindow,
} from "@/server/assignments/rules";
import { buildStudentAssignmentViews, type StudentAssignmentView } from "@/server/assignments/service";
import { clampPage } from "@/server/courses/service";

/**
 * Student-side reads (docs/fazlar/F5-F6-ogrenci-bildirim.md section 1). Every function takes the
 * student's user id and `now` explicitly so it is testable against the database. A student's
 * courses are exactly the `course_roster` rows linked to them; only published content is read.
 */

export { assignmentGroup };
export type { AssignmentGroup, Page, StudentAssignmentView, SubmissionWindow };

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

export type StudentAssignmentCard = StudentAssignmentView & {
  publishedAt: Date;
  group: AssignmentGroup;
};

export type FeedFilter = "tumu" | "odev" | "duyuru" | "materyal";

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
  | { kind: "assignment"; publishedAt: Date; assignment: StudentAssignmentCard };

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

type AssignmentRow = { assignment: typeof assignments.$inferSelect; course: typeof courses.$inferSelect };

const publishedAtOf = (a: typeof assignments.$inferSelect) => a.publishedAt ?? a.createdAt;

const GROUP_RANK: Record<AssignmentGroup, number> = { bekleyen: 0, teslim: 1, puan: 2, diger: 3 };

/** Group order from docs/fazlar/F8-sade-arayuz.md section 1; ids break ties so the order is stable. */
export function compareAssignmentCards(a: StudentAssignmentCard, b: StudentAssignmentCard): number {
  const rank = GROUP_RANK[a.group] - GROUP_RANK[b.group];
  if (rank !== 0) return rank;
  let diff = 0;
  if (a.group === "bekleyen") {
    const ad = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    diff = ad === bd ? 0 : ad < bd ? -1 : 1;
  } else if (a.group === "teslim") {
    diff = (b.submission?.submittedAt.getTime() ?? 0) - (a.submission?.submittedAt.getTime() ?? 0);
  } else {
    diff = b.publishedAt.getTime() - a.publishedAt.getTime();
  }
  return diff || a.id.localeCompare(b.id);
}

async function toCards(rows: AssignmentRow[], userId: string, now: Date): Promise<StudentAssignmentCard[]> {
  const views = await buildStudentAssignmentViews(rows, userId, now);
  return views.map((view, i) => ({
    ...view,
    publishedAt: publishedAtOf(rows[i]!.assignment),
    group: assignmentGroup(view),
  }));
}

export async function listCourseFeed(
  courseId: string,
  userId: string,
  now: Date,
  o: { filter: FeedFilter; page?: number },
): Promise<Page<FeedItem> | null> {
  const course = await findStudentCourse(courseId, userId);
  if (!course) return null;

  const assignmentWhere = and(
    eq(assignments.courseId, courseId),
    eq(assignments.status, "published"),
    isNotNull(assignments.publishedAt),
  );
  const loadAssignments = (limit: number) =>
    db
      .select({ assignment: assignments, course: courses })
      .from(assignments)
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .where(assignmentWhere)
      .orderBy(desc(assignments.publishedAt), asc(assignments.id))
      .limit(limit);

  if (o.filter === "odev") {
    const rows = await loadAssignments(ASSIGNMENT_LIST_LIMIT);
    const cards = (await toCards(rows, userId, now)).sort(compareAssignmentCards);
    const items: FeedItem[] = cards.map((assignment) => ({
      kind: "assignment",
      publishedAt: assignment.publishedAt,
      assignment,
    }));
    return { items, total: items.length, page: 1, pageSize: ASSIGNMENT_LIST_LIMIT };
  }

  const { page, pageSize } = clampPage(o.page, FEED_PAGE_SIZE);
  const take = page * pageSize;
  const postWhere = and(
    eq(posts.courseId, courseId),
    eq(posts.status, "published"),
    isNotNull(posts.publishedAt),
    o.filter === "materyal" ? eq(posts.type, "material") : undefined,
    o.filter === "duyuru" ? eq(posts.type, "announcement") : undefined,
  );

  const [postRows, [postTotal]] = await Promise.all([
    db.select().from(posts).where(postWhere).orderBy(desc(posts.publishedAt), asc(posts.id)).limit(take),
    db.select({ n: count() }).from(posts).where(postWhere),
  ]);

  type Entry = { at: Date; id: string; post?: (typeof postRows)[number]; row?: AssignmentRow };
  const entries: Entry[] = postRows.map((p) => ({ at: p.publishedAt as Date, id: p.id, post: p }));
  let total = postTotal?.n ?? 0;

  if (o.filter === "tumu") {
    const [assignmentRows, [assignmentTotal]] = await Promise.all([
      loadAssignments(take),
      db.select({ n: count() }).from(assignments).where(assignmentWhere),
    ]);
    for (const row of assignmentRows) entries.push({ at: publishedAtOf(row.assignment), id: row.assignment.id, row });
    total += assignmentTotal?.n ?? 0;
  }

  entries.sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));
  const pageEntries = entries.slice((page - 1) * pageSize, page * pageSize);

  // Only the assignments that land on this page are expanded into full cards.
  const pageRows = pageEntries.flatMap((e) => (e.row ? [e.row] : []));
  const cards = new Map((await toCards(pageRows, userId, now)).map((c) => [c.id, c]));

  const items: FeedItem[] = pageEntries.map((e) =>
    e.post
      ? {
          kind: "post",
          id: e.post.id,
          postType: e.post.type,
          title: e.post.title,
          bodyMd: e.post.bodyMd,
          links: e.post.links,
          publishedAt: e.at,
        }
      : { kind: "assignment", publishedAt: e.at, assignment: cards.get(e.id)! },
  );
  return { items, total, page, pageSize };
}

/** Published assignments of the student's non-archived courses, in group order (max 200). */
export async function listMyAssignmentCards(userId: string, now: Date): Promise<StudentAssignmentCard[]> {
  const rows = await db
    .select({ assignment: assignments, course: courses })
    .from(courseRoster)
    .innerJoin(courses, eq(courses.id, courseRoster.courseId))
    .innerJoin(assignments, eq(assignments.courseId, courses.id))
    .where(and(eq(courseRoster.userId, userId), isNull(courses.archivedAt), eq(assignments.status, "published")))
    .orderBy(desc(assignments.publishedAt), asc(assignments.id))
    .limit(ASSIGNMENT_LIST_LIMIT);
  return (await toCards(rows, userId, now)).sort(compareAssignmentCards);
}
