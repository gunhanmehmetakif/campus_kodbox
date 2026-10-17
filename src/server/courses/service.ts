import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db, type DbOrTx } from "@/db";
import {
  courseRoster,
  courses,
  posts,
  schools,
  terms,
  users,
  type Course,
  type LinkItem,
  type PostType,
} from "@/db/schema";
import { normalizeStudentNo } from "@/lib/identity";
import type { Page } from "@/lib/page";
import { audit } from "@/lib/server/audit";
import { blindIndex, decrypt, decryptNullable, encrypt, encryptNullable } from "@/lib/server/crypto";
import { notify } from "@/lib/server/notifications";

import { parseRosterText } from "./roster-parse";
import { normalizeCourseCode } from "./schemas";

/**
 * Course business logic (docs/fazlar/F2-F3-admin-ders.md section 3). Server actions and
 * queries stay thin: they resolve the signed-in instructor and call these functions with an
 * explicit actor, which also keeps them testable without a request context.
 */

export type Actor = { id: string; schoolId: string };
export type { Page };

/** Expected, user-facing failure (message is Turkish and shown as is). */
export class CourseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseError";
  }
}

export const NO_ACCESS = "Bu derse erişiminiz yok.";
export const ARCHIVED = "Arşivlenmiş ders değiştirilemez.";
const DUPLICATE_CODE = "Bu dönemde bu kodla bir dersiniz zaten var.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/* ───────────────────────────── ownership ───────────────────────────── */

/** The course if it exists and belongs to the instructor, else null. */
export async function findOwnedCourse(courseId: string, instructorId: string): Promise<Course | null> {
  if (!UUID.test(courseId)) return null;
  const [row] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.instructorId, instructorId)))
    .limit(1);
  return row ?? null;
}

/** Ownership check for writes; `allowArchived` is only for archive/unarchive. */
export async function requireOwnedCourse(
  courseId: string,
  actor: Actor,
  options: { allowArchived?: boolean } = {},
): Promise<Course> {
  const course = await findOwnedCourse(courseId, actor.id);
  if (!course) throw new CourseError(NO_ACCESS);
  if (course.archivedAt && !options.allowArchived) throw new CourseError(ARCHIVED);
  return course;
}

/* ───────────────────────────── courses ───────────────────────────── */

export async function createCourse(
  actor: Actor,
  input: { code: string; name: string; termId: string; description?: string },
): Promise<{ id: string }> {
  const [term] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.id, input.termId), eq(terms.schoolId, actor.schoolId)))
    .limit(1);
  if (!term) throw new CourseError("Dönem bulunamadı.");

  const code = normalizeCourseCode(input.code);
  const [row] = await db
    .insert(courses)
    .values({
      instructorId: actor.id,
      termId: term.id,
      code,
      name: input.name,
      description: input.description ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: courses.id });
  if (!row) throw new CourseError(DUPLICATE_CODE);

  await audit(actor.id, "course.create", { type: "course", id: row.id }, { code });
  return { id: row.id };
}

export async function updateCourse(
  actor: Actor,
  input: { id: string; code: string; name: string; description?: string },
): Promise<void> {
  const course = await requireOwnedCourse(input.id, actor);
  const code = normalizeCourseCode(input.code);
  if (code !== course.code) {
    const [clash] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.instructorId, actor.id), eq(courses.termId, course.termId), eq(courses.code, code)))
      .limit(1);
    if (clash) throw new CourseError(DUPLICATE_CODE);
  }
  await db
    .update(courses)
    .set({ code, name: input.name, description: input.description ?? null })
    .where(eq(courses.id, course.id));
  await audit(actor.id, "course.update", { type: "course", id: course.id });
}

export async function setCourseArchived(actor: Actor, input: { id: string; archived: boolean }): Promise<void> {
  const course = await requireOwnedCourse(input.id, actor, { allowArchived: true });
  await db
    .update(courses)
    .set({ archivedAt: input.archived ? (course.archivedAt ?? new Date()) : null })
    .where(eq(courses.id, course.id));
  await audit(actor.id, input.archived ? "course.archive" : "course.unarchive", { type: "course", id: course.id });
}

/* ───────────────────────────── roster ───────────────────────────── */

export type AddRosterResult = { added: number; updated: number; existing: number; invalid: string[] };

export async function addRoster(actor: Actor, input: { courseId: string; text: string }): Promise<AddRosterResult> {
  const course = await requireOwnedCourse(input.courseId, actor);
  const [school] = await db
    .select({ studentNoRegex: schools.studentNoRegex })
    .from(schools)
    .where(eq(schools.id, actor.schoolId))
    .limit(1);
  if (!school) throw new CourseError(NO_ACCESS);

  const { valid, invalid } = parseRosterText(input.text, school.studentNoRegex);
  const result: AddRosterResult = { added: 0, updated: 0, existing: 0, invalid };
  if (valid.length === 0) return result;

  const entries = valid.map((line) => ({ ...line, hash: blindIndex(line.studentNo) }));
  const hashes = entries.map((e) => e.hash);

  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(courseRoster)
      .where(and(eq(courseRoster.courseId, course.id), inArray(courseRoster.studentNoHash, hashes)));
    const registeredUsers = await tx
      .select({ id: users.id, studentNoHash: users.studentNoHash })
      .from(users)
      .where(
        and(
          eq(users.role, "student"),
          eq(users.schoolId, actor.schoolId),
          eq(users.status, "active"),
          inArray(users.studentNoHash, hashes),
        ),
      );
    const existingByHash = new Map(existingRows.map((r) => [r.studentNoHash, r]));
    const userByHash = new Map(registeredUsers.map((u) => [u.studentNoHash!, u.id]));

    const toInsert: (typeof courseRoster.$inferInsert)[] = [];
    const toNotify = new Set<string>();

    for (const entry of entries) {
      const row = existingByHash.get(entry.hash);
      const userId = userByHash.get(entry.hash) ?? null;
      if (!row) {
        toInsert.push({
          courseId: course.id,
          studentNoHash: entry.hash,
          studentNoEnc: encrypt(entry.studentNo),
          displayNameEnc: encryptNullable(entry.displayName),
          userId,
          addedById: actor.id,
        });
        if (userId) toNotify.add(userId);
        result.added++;
        continue;
      }

      const patch: Partial<typeof courseRoster.$inferInsert> = {};
      if (entry.displayName && entry.displayName !== decryptNullable(row.displayNameEnc)) {
        patch.displayNameEnc = encrypt(entry.displayName);
        result.updated++;
      } else {
        result.existing++;
      }
      if (!row.userId && userId) {
        patch.userId = userId;
        toNotify.add(userId);
      }
      if (Object.keys(patch).length > 0) {
        await tx.update(courseRoster).set(patch).where(eq(courseRoster.id, row.id));
      }
    }

    if (toInsert.length > 0) await tx.insert(courseRoster).values(toInsert);
    await notify(
      [...toNotify],
      "course.enrolled",
      { courseId: course.id, courseCode: course.code, courseName: course.name },
      tx,
    );
    await audit(
      actor.id,
      "roster.add",
      { type: "course", id: course.id },
      { added: result.added, updated: result.updated, existing: result.existing, invalid: invalid.length },
      tx,
    );
  });

  return result;
}

export async function removeRosterEntry(actor: Actor, input: { courseId: string; id: string }): Promise<void> {
  const course = await requireOwnedCourse(input.courseId, actor);
  if (!UUID.test(input.id)) throw new CourseError("Öğrenci kaydı bulunamadı.");
  const removed = await db
    .delete(courseRoster)
    .where(and(eq(courseRoster.id, input.id), eq(courseRoster.courseId, course.id)))
    .returning({ id: courseRoster.id });
  if (removed.length === 0) throw new CourseError("Öğrenci kaydı bulunamadı.");
  await audit(actor.id, "roster.remove", { type: "course", id: course.id });
}

export type RosterRow = {
  id: string;
  studentNo: string;
  displayName: string | null;
  registered: boolean;
  addedAt: Date;
};

export function clampPage(page: number | undefined, pageSize = DEFAULT_PAGE_SIZE) {
  const size = Math.min(Math.max(Math.trunc(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const current = Math.max(Math.trunc(page ?? 1) || 1, 1);
  return { page: current, pageSize: size };
}

/** Decrypts and filters in memory: a course has at most a few hundred rows. */
export async function listRosterRows(
  courseId: string,
  options: { page?: number; studentNo?: string; filter?: "all" | "registered" | "unregistered" },
): Promise<Page<RosterRow>> {
  const rows = await db
    .select()
    .from(courseRoster)
    .where(
      and(
        eq(courseRoster.courseId, courseId),
        options.filter === "registered" ? isNotNull(courseRoster.userId) : undefined,
        options.filter === "unregistered" ? isNull(courseRoster.userId) : undefined,
      ),
    );

  const needle = options.studentNo ? normalizeStudentNo(options.studentNo) : "";
  let all: RosterRow[] = rows.map((r) => ({
    id: r.id,
    studentNo: decrypt(r.studentNoEnc),
    displayName: decryptNullable(r.displayNameEnc),
    registered: r.userId !== null,
    addedAt: r.addedAt,
  }));
  if (needle) all = all.filter((r) => r.studentNo.includes(needle));
  all.sort((a, b) => a.studentNo.localeCompare(b.studentNo, "en", { numeric: true }));

  const { page, pageSize } = clampPage(options.page);
  return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize };
}

/* ───────────────────────────── posts ───────────────────────────── */

export type PostRow = {
  id: string;
  type: PostType;
  title: string;
  bodyMd: string;
  links: LinkItem[];
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
};

const postColumns = {
  id: posts.id,
  type: posts.type,
  title: posts.title,
  bodyMd: posts.bodyMd,
  links: posts.links,
  status: posts.status,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
};

export async function listPostRows(courseId: string, type: PostType): Promise<PostRow[]> {
  return (
    db
      .select(postColumns)
      .from(posts)
      .where(and(eq(posts.courseId, courseId), eq(posts.type, type)))
      // drafts first (enum order: draft < published), then newest published
      .orderBy(asc(posts.status), desc(posts.publishedAt), desc(posts.updatedAt))
  );
}

export async function findPostForInstructor(
  postId: string,
  instructorId: string,
): Promise<(PostRow & { courseId: string }) | null> {
  if (!UUID.test(postId)) return null;
  const [row] = await db
    .select({ ...postColumns, courseId: posts.courseId })
    .from(posts)
    .innerJoin(courses, eq(courses.id, posts.courseId))
    .where(and(eq(posts.id, postId), eq(courses.instructorId, instructorId)))
    .limit(1);
  return row ?? null;
}

export async function savePost(
  actor: Actor,
  input: {
    courseId: string;
    id?: string;
    type: PostType;
    title: string;
    bodyMd: string;
    links: LinkItem[];
    intent: "draft" | "publish";
  },
): Promise<{ id: string }> {
  const course = await requireOwnedCourse(input.courseId, actor);

  return db.transaction(async (tx) => {
    const now = new Date();
    if (!input.id) {
      const publish = input.intent === "publish";
      const [row] = await tx
        .insert(posts)
        .values({
          courseId: course.id,
          authorId: actor.id,
          type: input.type,
          title: input.title,
          bodyMd: input.bodyMd,
          links: input.links,
          status: publish ? "published" : "draft",
          publishedAt: publish ? now : null,
        })
        .returning({ id: posts.id });
      if (publish) await notifyPublished(tx, course, row!.id, input.type, input.title);
      return { id: row!.id };
    }

    const [existing] = await tx
      .select()
      .from(posts)
      .where(and(eq(posts.id, input.id), eq(posts.courseId, course.id)))
      .limit(1);
    if (!existing) throw new CourseError("İçerik bulunamadı.");

    // Published content never goes back to draft; only the first publish notifies.
    const firstPublish = existing.status === "draft" && input.intent === "publish";
    await tx
      .update(posts)
      .set({
        title: input.title,
        bodyMd: input.bodyMd,
        links: input.links,
        ...(firstPublish ? { status: "published" as const, publishedAt: now } : {}),
      })
      .where(eq(posts.id, existing.id));
    if (firstPublish) await notifyPublished(tx, course, existing.id, existing.type, input.title);
    return { id: existing.id };
  });
}

/** Notifies the active students linked in the course roster. */
async function notifyPublished(tx: DbOrTx, course: Course, postId: string, postType: PostType, title: string) {
  const recipients = await tx
    .select({ id: users.id })
    .from(courseRoster)
    .innerJoin(users, eq(users.id, courseRoster.userId))
    .where(and(eq(courseRoster.courseId, course.id), eq(users.status, "active")));
  await notify(
    recipients.map((r) => r.id),
    "post.published",
    { courseId: course.id, courseCode: course.code, postId, postType, title },
    tx,
  );
}

export async function deletePost(actor: Actor, input: { courseId: string; id: string }): Promise<void> {
  const course = await requireOwnedCourse(input.courseId, actor);
  if (!UUID.test(input.id)) throw new CourseError("İçerik bulunamadı.");
  await db.transaction(async (tx) => {
    const [post] = await tx
      .delete(posts)
      .where(and(eq(posts.id, input.id), eq(posts.courseId, course.id)))
      .returning({ id: posts.id, title: posts.title, type: posts.type });
    if (!post) throw new CourseError("İçerik bulunamadı.");
    await audit(actor.id, "post.delete", { type: "post", id: post.id }, { title: post.title, type: post.type }, tx);
  });
}

/* ───────────────────────────── reads ───────────────────────────── */

export async function listTermsForSchool(schoolId: string) {
  return db
    .select({ id: terms.id, name: terms.name, isActive: terms.isActive })
    .from(terms)
    .where(eq(terms.schoolId, schoolId))
    .orderBy(desc(terms.isActive), desc(terms.startsOn), desc(terms.createdAt));
}

const studentCountSql = sql<number>`(select count(*)::int from ${courseRoster} where ${courseRoster.courseId} = ${courses.id})`;
const registeredCountSql = sql<number>`(select count(*)::int from ${courseRoster} where ${courseRoster.courseId} = ${courses.id} and ${courseRoster.userId} is not null)`;

export async function listCoursesOf(instructorId: string, archived: boolean) {
  return db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      termName: terms.name,
      studentCount: studentCountSql,
      registeredCount: registeredCountSql,
      archivedAt: courses.archivedAt,
    })
    .from(courses)
    .innerJoin(terms, eq(terms.id, courses.termId))
    .where(
      and(eq(courses.instructorId, instructorId), archived ? isNotNull(courses.archivedAt) : isNull(courses.archivedAt)),
    )
    .orderBy(desc(terms.isActive), desc(courses.createdAt));
}

export async function getCourseDetail(courseId: string, instructorId: string, schoolId: string) {
  if (!UUID.test(courseId)) return null;
  const [row] = await db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      description: courses.description,
      termId: terms.id,
      termName: terms.name,
      archivedAt: courses.archivedAt,
      studentCount: studentCountSql,
      registeredCount: registeredCountSql,
    })
    .from(courses)
    .innerJoin(terms, eq(terms.id, courses.termId))
    .where(and(eq(courses.id, courseId), eq(courses.instructorId, instructorId)))
    .limit(1);
  if (!row) return null;
  const [school] = await db
    .select({ studentNoRegex: schools.studentNoRegex })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  return { ...row, studentNoRegex: school?.studentNoRegex ?? "" };
}
