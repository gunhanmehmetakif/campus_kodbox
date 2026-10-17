import "server-only";

import { randomInt } from "node:crypto";

import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, courses, schools, sessions, terms, users } from "@/db/schema";
import { normalizeStudentNo, staffEmail } from "@/lib/identity";
import { maskStudentNo } from "@/lib/mask";
import type { Page } from "@/lib/page";
import { audit, type AuditAction } from "@/lib/server/audit";
import { blindIndex, decrypt, encrypt } from "@/lib/server/crypto";
import { hashPassword } from "@/lib/server/password";

import type { CreateInstructorInput, UpdateSchoolInput } from "./schemas";

/**
 * Admin business logic (docs/fazlar/F2-F3-admin-ders.md section 2). Every function takes the
 * acting admin's `schoolId` explicitly and never touches cookies or headers, so it is testable
 * against the database. Authorization (requireRole) happens in queries.ts and actions.ts.
 *
 * Expected failures throw `AdminError` with a Turkish message; actions return it to the user.
 */

export class AdminError extends Error {}

export type { Page };

export type Actor = { id: string; schoolId: string };

export const PAGE_SIZE = 50;

function normalizePage(page: number | undefined): number {
  return page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageOffset(page: number): number {
  return (page - 1) * PAGE_SIZE;
}

/** Postgres unique violation (drizzle may wrap the driver error in `cause`). */
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === "object" && e !== null ? (e as { code?: unknown }).code : undefined);
  return code(error) === "23505" || code((error as { cause?: unknown } | null)?.cause) === "23505";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ───────────────────────────── temporary password ───────────────────────────── */

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const TEMP_PASSWORD_LENGTH = 12;

/** 12 readable characters (no 0 O 1 l I), always containing at least one letter and one digit. */
export function generateTempPassword(): string {
  const alphabet = LETTERS + DIGITS;
  for (;;) {
    let out = "";
    for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) out += alphabet[randomInt(alphabet.length)];
    if (/[A-Za-z]/.test(out) && /\d/.test(out)) return out;
  }
}

/* ───────────────────────────── queries ───────────────────────────── */

export async function getDashboard(schoolId: string) {
  const [[instructors], [students], [activeTerm]] = await Promise.all([
    db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "instructor"), eq(users.status, "active"))),
    db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student"), eq(users.status, "active"))),
    db
      .select({ id: terms.id, name: terms.name })
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isActive, true)))
      .limit(1),
  ]);
  let activeCourseCount = 0;
  if (activeTerm) {
    const [row] = await db
      .select({ n: count() })
      .from(courses)
      .where(and(eq(courses.termId, activeTerm.id), isNull(courses.archivedAt)));
    activeCourseCount = row?.n ?? 0;
  }
  return {
    instructorCount: instructors?.n ?? 0,
    activeStudentCount: students?.n ?? 0,
    activeCourseCount,
    activeTerm: activeTerm ?? null,
  };
}

export async function listInstructors(
  schoolId: string,
  o: { page?: number; q?: string; status?: "active" | "disabled" },
) {
  const page = normalizePage(o.page);
  const conditions: SQL[] = [eq(users.schoolId, schoolId), eq(users.role, "instructor")];
  if (o.status) conditions.push(eq(users.status, o.status));
  const q = o.q?.trim();
  if (q) conditions.push(ilike(users.displayName, `%${escapeLike(q)}%`));
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        emailEnc: users.emailEnc,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        lastLoginAt: users.lastLoginAt,
        courseCount: sql<number>`(select count(*)::int from courses c where c.instructor_id = "users"."id")`,
      })
      .from(users)
      .where(where)
      .orderBy(sql`lower(${users.displayName})`, users.id)
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.select({ n: count() }).from(users).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      displayName: r.displayName ?? "",
      email: decrypt(r.emailEnc),
      status: r.status === "disabled" ? ("disabled" as const) : ("active" as const),
      mustChangePassword: r.mustChangePassword,
      lastLoginAt: r.lastLoginAt,
      courseCount: r.courseCount,
    })),
    total: total?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function listStudents(
  schoolId: string,
  o: { page?: number; studentNo?: string; status?: "active" | "disabled" },
) {
  const page = normalizePage(o.page);
  const conditions: SQL[] = [eq(users.schoolId, schoolId), eq(users.role, "student")];
  if (o.status) conditions.push(eq(users.status, o.status));
  const studentNo = o.studentNo ? normalizeStudentNo(o.studentNo) : "";
  if (studentNo) conditions.push(eq(users.studentNoHash, blindIndex(studentNo)));
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        studentNoEnc: users.studentNoEnc,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        courseCount: sql<number>`(select count(*)::int from course_roster r where r.user_id = "users"."id")`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), users.id)
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.select({ n: count() }).from(users).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      studentNoMasked: r.studentNoEnc ? maskStudentNo(decrypt(r.studentNoEnc)) : "",
      status: r.status === "disabled" ? ("disabled" as const) : ("active" as const),
      createdAt: r.createdAt,
      lastLoginAt: r.lastLoginAt,
      courseCount: r.courseCount,
    })),
    total: total?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Courses of one term (default: the active term). `archived: true` includes archived courses
 * next to active ones; otherwise only non-archived courses are listed.
 */
export async function listCourses(schoolId: string, o: { page?: number; termId?: string; archived?: boolean }) {
  const page = normalizePage(o.page);
  let termId = o.termId;
  if (!termId) {
    const [active] = await db
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isActive, true)))
      .limit(1);
    termId = active?.id;
  }
  if (!termId) return { items: [], total: 0, page, pageSize: PAGE_SIZE };

  const conditions: SQL[] = [eq(terms.schoolId, schoolId), eq(courses.termId, termId)];
  if (!o.archived) conditions.push(isNull(courses.archivedAt));
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        instructorName: users.displayName,
        termName: terms.name,
        archivedAt: courses.archivedAt,
        studentCount: sql<number>`(select count(*)::int from course_roster r where r.course_id = "courses"."id")`,
      })
      .from(courses)
      .innerJoin(terms, eq(terms.id, courses.termId))
      .innerJoin(users, eq(users.id, courses.instructorId))
      .where(where)
      .orderBy(courses.code, courses.id)
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.select({ n: count() }).from(courses).innerJoin(terms, eq(terms.id, courses.termId)).where(where),
  ]);

  return {
    items: rows.map((r) => ({ ...r, instructorName: r.instructorName ?? "" })),
    total: total?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function listTerms(schoolId: string) {
  return db
    .select({
      id: terms.id,
      name: terms.name,
      startsOn: terms.startsOn,
      endsOn: terms.endsOn,
      isActive: terms.isActive,
      courseCount: sql<number>`(select count(*)::int from courses c where c.term_id = "terms"."id")`,
      activeCourseCount: sql<number>`(select count(*)::int from courses c where c.term_id = "terms"."id" and c.archived_at is null)`,
    })
    .from(terms)
    .where(eq(terms.schoolId, schoolId))
    .orderBy(desc(terms.isActive), desc(terms.createdAt), terms.id);
}

export async function getSchool(schoolId: string) {
  const [row] = await db
    .select({
      id: schools.id,
      name: schools.name,
      studentEmailDomain: schools.studentEmailDomain,
      staffEmailDomain: schools.staffEmailDomain,
      studentNoRegex: schools.studentNoRegex,
    })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!row) throw new Error("School not found.");
  return row;
}

const AUDIT_LABELS: Record<AuditAction, string> = {
  "auth.login": "Giriş yapıldı",
  "auth.logout": "Çıkış yapıldı",
  "auth.password_change": "Şifre değiştirildi",
  "auth.password_reset": "Şifre sıfırlandı",
  "auth.oauth_link": "Google hesabı bağlandı",
  "auth.oauth_unlink": "Google bağlantısı kaldırıldı",
  "user.register": "Öğrenci kaydı yapıldı",
  "instructor.create": "Eğitmen oluşturuldu",
  "instructor.update": "Eğitmen güncellendi",
  "instructor.password_reset": "Eğitmen şifresi sıfırlandı",
  "user.disable": "Hesap devre dışı bırakıldı",
  "user.enable": "Hesap etkinleştirildi",
  "school.update": "Okul ayarları güncellendi",
  "term.create": "Dönem oluşturuldu",
  "term.update": "Dönem güncellendi",
  "term.activate": "Aktif dönem değiştirildi",
  "term.archive_courses": "Dönem dersleri arşivlendi",
  "course.create": "Ders oluşturuldu",
  "course.update": "Ders güncellendi",
  "course.archive": "Ders arşivlendi",
  "course.unarchive": "Ders arşivden çıkarıldı",
  "course.delete": "Ders silindi",
  "roster.add": "Öğrenci listesine ekleme yapıldı",
  "roster.remove": "Öğrenci listeden çıkarıldı",
  "assignment.dates_change": "Ödev tarihleri değiştirildi",
  "assignment.delete": "Ödev silindi",
  "post.delete": "Paylaşım silindi",
  "submission.score_publish": "Puanlar yayınlandı",
  "seed.run": "Başlangıç verisi yüklendi",
};

/** Action filter options for the audit screen (value + Turkish label). */
export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_LABELS).map(([value, label]) => ({ value, label }));

type LabelUser = { role: string; displayName: string | null; studentNoEnc: string | null };

function userLabel(u: LabelUser): string {
  if (u.role === "student") return u.studentNoEnc ? maskStudentNo(decrypt(u.studentNoEnc)) : "Öğrenci";
  return u.displayName ?? "Personel";
}

export async function listAuditLogs(schoolId: string, o: { page?: number; action?: string }) {
  const page = normalizePage(o.page);
  const conditions: SQL[] = [or(isNull(auditLogs.actorId), eq(users.schoolId, schoolId))!];
  if (o.action) conditions.push(eq(auditLogs.action, o.action));
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        actorRole: users.role,
        actorName: users.displayName,
        actorStudentNoEnc: users.studentNoEnc,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.select({ n: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where),
  ]);

  const targetLabels = await resolveTargetLabels(rows);

  return {
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actorLabel: r.actorRole
        ? userLabel({ role: r.actorRole, displayName: r.actorName, studentNoEnc: r.actorStudentNoEnc })
        : "Sistem",
      action: r.action,
      actionLabel: AUDIT_LABELS[r.action as AuditAction] ?? r.action,
      targetLabel: r.targetType && r.targetId ? (targetLabels.get(`${r.targetType}:${r.targetId}`) ?? null) : null,
    })),
    total: total?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveTargetLabels(rows: { targetType: string | null; targetId: string | null }[]) {
  const idsOf = (type: string) => [
    ...new Set(
      rows.filter((r) => r.targetType === type && r.targetId && UUID_RE.test(r.targetId)).map((r) => r.targetId!),
    ),
  ];
  const labels = new Map<string, string>();

  const userIds = idsOf("user");
  const termIds = idsOf("term");
  const courseIds = idsOf("course");
  const schoolIds = idsOf("school");

  const [userRows, termRows, courseRows, schoolRows] = await Promise.all([
    userIds.length
      ? db
          .select({ id: users.id, role: users.role, displayName: users.displayName, studentNoEnc: users.studentNoEnc })
          .from(users)
          .where(inArray(users.id, userIds))
      : [],
    termIds.length ? db.select({ id: terms.id, name: terms.name }).from(terms).where(inArray(terms.id, termIds)) : [],
    courseIds.length
      ? db
          .select({ id: courses.id, code: courses.code, name: courses.name })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : [],
    schoolIds.length
      ? db.select({ id: schools.id, name: schools.name }).from(schools).where(inArray(schools.id, schoolIds))
      : [],
  ]);

  for (const u of userRows) labels.set(`user:${u.id}`, userLabel(u));
  for (const t of termRows) labels.set(`term:${t.id}`, t.name);
  for (const c of courseRows) labels.set(`course:${c.id}`, `${c.code} · ${c.name}`);
  for (const s of schoolRows) labels.set(`school:${s.id}`, s.name);
  return labels;
}

/* ───────────────────────────── instructors ───────────────────────────── */

export async function createInstructor(
  actor: Actor,
  input: CreateInstructorInput,
): Promise<{ id: string; tempPassword: string }> {
  const school = await getSchool(actor.schoolId);
  const email = staffEmail(input.local, school);
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const now = new Date();

  try {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({
          role: "instructor",
          schoolId: actor.schoolId,
          emailEnc: encrypt(email),
          emailHash: blindIndex(email),
          displayName: input.displayName,
          passwordHash,
          status: "active",
          mustChangePassword: true,
          emailVerifiedAt: now,
          passwordChangedAt: now,
        })
        .returning({ id: users.id });
      await audit(actor.id, "instructor.create", { type: "user", id: row!.id }, { displayName: input.displayName }, tx);
      return row!.id;
    });
    return { id, tempPassword };
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError("Bu mail adresiyle bir hesap zaten var.");
    throw error;
  }
}

async function findUserInSchool(schoolId: string, id: string) {
  const [row] = await db
    .select({ id: users.id, role: users.role, status: users.status, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, id), eq(users.schoolId, schoolId)))
    .limit(1);
  if (!row) throw new AdminError("Kullanıcı bulunamadı.");
  return row;
}

async function requireInstructor(schoolId: string, id: string) {
  const row = await findUserInSchool(schoolId, id);
  if (row.role !== "instructor") throw new AdminError("Kullanıcı bulunamadı.");
  return row;
}

export async function updateInstructor(actor: Actor, input: { id: string; displayName: string }) {
  await requireInstructor(actor.schoolId, input.id);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ displayName: input.displayName }).where(eq(users.id, input.id));
    await audit(actor.id, "instructor.update", { type: "user", id: input.id }, { displayName: input.displayName }, tx);
  });
}

export async function resetInstructorPassword(actor: Actor, id: string): Promise<{ tempPassword: string }> {
  await requireInstructor(actor.schoolId, id);
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: true, passwordChangedAt: new Date() })
      .where(eq(users.id, id));
    await tx.delete(sessions).where(eq(sessions.userId, id));
    await audit(actor.id, "instructor.password_reset", { type: "user", id }, {}, tx);
  });
  return { tempPassword };
}

export async function setUserStatus(actor: Actor, input: { id: string; status: "active" | "disabled" }) {
  if (input.id === actor.id) throw new AdminError("Kendi hesabınızı devre dışı bırakamazsınız.");
  const target = await findUserInSchool(actor.schoolId, input.id);
  if (target.role === "admin") throw new AdminError("Yönetici hesaplarının durumu değiştirilemez.");
  if (target.status === "pending") throw new AdminError("Bu hesap henüz etkinleştirilmemiş.");
  if (target.status === input.status) return;
  if (input.status === "active" && !target.passwordHash) throw new AdminError("Bu hesap etkinleştirilemez.");

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ status: input.status, disabledAt: input.status === "disabled" ? new Date() : null })
      .where(eq(users.id, input.id));
    if (input.status === "disabled") await tx.delete(sessions).where(eq(sessions.userId, input.id));
    await audit(
      actor.id,
      input.status === "disabled" ? "user.disable" : "user.enable",
      { type: "user", id: input.id },
      { role: target.role },
      tx,
    );
  });
}

/* ───────────────────────────── terms ───────────────────────────── */

const TERM_EXISTS = "Bu dönem zaten var.";

export async function createTerm(
  actor: Actor,
  input: { name: string; startsOn?: string; endsOn?: string },
): Promise<{ id: string }> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(terms)
        .values({
          schoolId: actor.schoolId,
          name: input.name,
          startsOn: input.startsOn ?? null,
          endsOn: input.endsOn ?? null,
        })
        .returning({ id: terms.id });
      await audit(actor.id, "term.create", { type: "term", id: row!.id }, { name: input.name }, tx);
      return { id: row!.id };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError(TERM_EXISTS);
    throw error;
  }
}

async function requireTerm(schoolId: string, id: string) {
  const [row] = await db
    .select({ id: terms.id, name: terms.name })
    .from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, schoolId)))
    .limit(1);
  if (!row) throw new AdminError("Dönem bulunamadı.");
  return row;
}

export async function updateTerm(actor: Actor, input: { id: string; name: string; startsOn?: string; endsOn?: string }) {
  await requireTerm(actor.schoolId, input.id);
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(terms)
        .set({ name: input.name, startsOn: input.startsOn ?? null, endsOn: input.endsOn ?? null })
        .where(eq(terms.id, input.id));
      await audit(actor.id, "term.update", { type: "term", id: input.id }, { name: input.name }, tx);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError(TERM_EXISTS);
    throw error;
  }
}

/** Single transaction: the previous active term is cleared and the new one set. */
export async function setActiveTerm(actor: Actor, id: string) {
  const term = await requireTerm(actor.schoolId, id);
  await db.transaction(async (tx) => {
    await tx
      .update(terms)
      .set({ isActive: false })
      .where(and(eq(terms.schoolId, actor.schoolId), eq(terms.isActive, true)));
    await tx.update(terms).set({ isActive: true }).where(eq(terms.id, id));
    await audit(actor.id, "term.activate", { type: "term", id }, { name: term.name }, tx);
  });
}

export async function archiveTermCourses(actor: Actor, id: string): Promise<{ count: number }> {
  await requireTerm(actor.schoolId, id);
  return db.transaction(async (tx) => {
    const archived = await tx
      .update(courses)
      .set({ archivedAt: new Date() })
      .where(and(eq(courses.termId, id), isNull(courses.archivedAt)))
      .returning({ id: courses.id });
    await audit(actor.id, "term.archive_courses", { type: "term", id }, { count: archived.length }, tx);
    return { count: archived.length };
  });
}

/* ───────────────────────────── school ───────────────────────────── */

export async function updateSchool(actor: Actor, input: UpdateSchoolInput) {
  await db.transaction(async (tx) => {
    await tx
      .update(schools)
      .set({ name: input.name, studentNoRegex: input.studentNoRegex })
      .where(eq(schools.id, actor.schoolId));
    await audit(
      actor.id,
      "school.update",
      { type: "school", id: actor.schoolId },
      { fields: ["name", "studentNoRegex"] },
      tx,
    );
  });
}
