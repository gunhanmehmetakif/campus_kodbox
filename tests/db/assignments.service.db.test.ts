/**
 * Ödev servisi: gerçek veritabanı entegrasyon testi (docs/fazlar/F4-odev-teslim.md bölüm 7).
 * Veritabanına erişilemezse test paketi atlanır. Her test kendi benzersiz verisini üretir.
 */
import { and, eq, inArray, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { parseIstanbulLocal } from "@/server/assignments/rules";
import { saveAssignmentSchema, type SaveAssignmentInput } from "@/server/assignments/schemas";

async function canConnect(): Promise<boolean> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

const available = await canConnect();

describe.skipIf(!available)("assignments service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const courseService = await import("@/server/courses/service");
  const service = await import("@/server/assignments/service");
  const { users, terms, courses, notifications, assignments, submissions, submissionHistory, schools, auditLogs, rateLimits } =
    schema;

  const createdUserIds: string[] = [];
  const createdTermIds: string[] = [];

  const rnd = () => crypto.randomUUID();
  const studentNo = () => String(Math.floor(100_000_000 + Math.random() * 899_999_999));
  let school: NonNullable<Awaited<ReturnType<typeof getDefaultSchool>>>;

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle", migrationsTable: "__drizzle_migrations", migrationsSchema: "public" });
    await db
      .insert(schools)
      .values({
        slug: "mku",
        name: "Mustafa Kemal Üniversitesi",
        studentEmailDomain: "ogr.mku.edu.tr",
        staffEmailDomain: "mku.edu.tr",
        studentNoRegex: "^\\d{6,12}$",
      })
      .onConflictDoNothing();
    const found = await getDefaultSchool();
    if (!found) throw new Error("test school missing");
    school = found;
  });

  afterAll(async () => {
    if (createdTermIds.length > 0) {
      await db.delete(courses).where(inArray(courses.termId, createdTermIds));
      await db.delete(terms).where(inArray(terms.id, createdTermIds));
    }
    for (const id of createdUserIds) await db.delete(rateLimits).where(like(rateLimits.key, `linkcheck:${id}%`));
    if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
    await db.$client.end({ timeout: 2 });
  });

  async function createInstructor() {
    const email = `a${rnd().slice(0, 8)}@${school.staffEmailDomain}`;
    const [row] = await db
      .insert(users)
      .values({
        role: "instructor",
        schoolId: school.id,
        emailEnc: encrypt(email),
        emailHash: blindIndex(email),
        displayName: "Test Eğitmen",
        passwordHash: "x",
        status: "active",
      })
      .returning();
    createdUserIds.push(row!.id);
    return { id: row!.id, schoolId: school.id };
  }

  async function createStudent(no = studentNo()) {
    const email = `${no}@${school.studentEmailDomain}`;
    const [row] = await db
      .insert(users)
      .values({
        role: "student",
        schoolId: school.id,
        emailEnc: encrypt(email),
        emailHash: blindIndex(email),
        studentNoEnc: encrypt(no),
        studentNoHash: blindIndex(no),
        passwordHash: "x",
        status: "active",
      })
      .returning();
    createdUserIds.push(row!.id);
    return { id: row!.id, no };
  }

  async function setup() {
    const actor = await createInstructor();
    const [term] = await db.insert(terms).values({ schoolId: school.id, name: `T-${rnd()}` }).returning();
    createdTermIds.push(term!.id);
    const { id: courseId } = await courseService.createCourse(actor, {
      code: "bil 201",
      name: "Veri Yapıları",
      termId: term!.id,
    });
    const student = await createStudent();
    await courseService.addRoster(actor, { courseId, text: `${student.no} Ayşe Yılmaz` });
    return { actor, courseId, student };
  }

  const form = (courseId: string, over: Record<string, string> = {}): SaveAssignmentInput =>
    saveAssignmentSchema.parse({
      courseId,
      title: "Ödev 1",
      bodyMd: "Açıklama",
      submissionType: "link",
      intent: "publish",
      ...over,
    });

  const notificationsOf = (userId: string, type: string) =>
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, type)));

  const DRIVE = "https://drive.google.com/file/d/abc/view";

  it("ödev oluşturur; taslakta bildirim yok, ilk yayında kayıtlı öğrenciye gider, sonra tekrar gitmez", async () => {
    const { actor, courseId, student } = await setup();
    const draft = await service.saveAssignment(actor, form(courseId, { intent: "draft" }));
    expect(draft.status).toBe("draft");
    expect(await notificationsOf(student.id, "assignment.published")).toHaveLength(0);

    const published = await service.saveAssignment(actor, form(courseId, { id: draft.id, intent: "publish", title: "Yayın" }));
    expect(published).toEqual({ id: draft.id, status: "published" });
    const sent = await notificationsOf(student.id, "assignment.published");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.payload).toMatchObject({ assignmentId: draft.id, title: "Yayın", dueAt: null });

    await service.saveAssignment(actor, form(courseId, { id: draft.id, intent: "draft", title: "Yeniden" }));
    expect(await notificationsOf(student.id, "assignment.published")).toHaveLength(1);
    const [row] = await db.select().from(assignments).where(eq(assignments.id, draft.id));
    expect(row!.status).toBe("published"); // never back to draft
  });

  it("tarih değişince bildirim, hatırlatma sıfırlama, audit; mevcut isLate değişmez", async () => {
    const { actor, courseId, student } = await setup();
    const { id } = await service.saveAssignment(actor, form(courseId, { dueAt: "2026-10-14T23:59" }));
    await db.update(assignments).set({ dueReminderSentAt: new Date() }).where(eq(assignments.id, id));

    // on time submission, then the instructor moves the deadline into the past
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE }, parseIstanbulLocal("2026-10-14T10:00"));
    await service.saveAssignment(
      actor,
      form(courseId, { id, dueAt: "2026-10-01T23:59", lateAllowed: "on", latePenaltyType: "percent", latePenaltyValue: "10" }),
    );

    const [a] = await db.select().from(assignments).where(eq(assignments.id, id));
    expect(a!.dueReminderSentAt).toBeNull();
    expect(await notificationsOf(student.id, "assignment.dates_changed")).toHaveLength(1);
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "assignment.dates_change"), eq(auditLogs.targetId, id)));
    expect(logs).toHaveLength(1);
    const [s] = await db.select().from(submissions).where(eq(submissions.assignmentId, id));
    expect(s!.isLate).toBe(false);

    // saving without date changes does not notify again
    await service.saveAssignment(
      actor,
      form(courseId, {
        id,
        title: "Yeni başlık",
        dueAt: "2026-10-01T23:59",
        lateAllowed: "on",
        latePenaltyType: "percent",
        latePenaltyValue: "10",
      }),
    );
    expect(await notificationsOf(student.id, "assignment.dates_changed")).toHaveLength(1);
  });

  it("öğrenci teslim eder ve günceller; her teslim geçmişe yazılır, aynı URL de", async () => {
    const { actor, courseId, student } = await setup();
    const { id } = await service.saveAssignment(actor, form(courseId));

    const t1 = new Date("2026-10-10T10:00:00Z");
    const t2 = new Date("2026-10-10T11:00:00Z");
    const t3 = new Date("2026-10-10T12:00:00Z");
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE }, t1);
    await service.submitAssignment(student, { assignmentId: id, url: "https://docs.google.com/document/d/2" }, t2);
    await service.submitAssignment(student, { assignmentId: id, url: "https://docs.google.com/document/d/2" }, t3);

    const [s] = await db.select().from(submissions).where(eq(submissions.assignmentId, id));
    expect(s!.url).toBe("https://docs.google.com/document/d/2");
    expect(s!.submittedAt).toEqual(t3);
    const history = await db.select().from(submissionHistory).where(eq(submissionHistory.submissionId, s!.id));
    expect(history).toHaveLength(3);

    const view = await service.getStudentAssignmentView(id, student.id, t3);
    expect(view!.window.state).toBe("open");
    expect(view!.submission!.history.map((h) => h.submittedAt)).toEqual([t3, t2, t1]);
    expect(view!.submission!.result).toBeNull();
  });

  it("Drive dışı link reddedilir; allowAnyLink açıkken kabul edilir", async () => {
    const { actor, courseId, student } = await setup();
    const strict = await service.saveAssignment(actor, form(courseId));
    await expect(
      service.submitAssignment(student, { assignmentId: strict.id, url: "https://github.com/a/b" }),
    ).rejects.toThrow("Lütfen bir Google Drive bağlantısı yapıştırın.");
    await expect(service.submitAssignment(student, { assignmentId: strict.id, url: "javascript:x" })).rejects.toThrow(
      "Geçerli bir bağlantı girin.",
    );
    const open = await service.saveAssignment(actor, form(courseId, { allowAnyLink: "on" }));
    await expect(
      service.submitAssignment(student, { assignmentId: open.id, url: "https://github.com/a/b" }),
    ).resolves.toHaveProperty("isLate", false);
  });

  it("geç teslim işaretlenir; kapalı pencerede ve arşivli derste reddedilir", async () => {
    const { actor, courseId, student } = await setup();
    const closed = await service.saveAssignment(actor, form(courseId, { dueAt: "2026-10-14T23:59" }));
    const after = parseIstanbulLocal("2026-10-15T08:00");
    await expect(service.submitAssignment(student, { assignmentId: closed.id, url: DRIVE }, after)).rejects.toThrow(
      "Teslim süresi doldu.",
    );

    const late = await service.saveAssignment(
      actor,
      form(courseId, { dueAt: "2026-10-14T23:59", lateAllowed: "on", lateUntil: "2026-10-16T23:59" }),
    );
    const res = await service.submitAssignment(student, { assignmentId: late.id, url: DRIVE }, after);
    expect(res.isLate).toBe(true);
    await expect(
      service.submitAssignment(student, { assignmentId: late.id, url: DRIVE }, parseIstanbulLocal("2026-10-17T00:00")),
    ).rejects.toThrow("Teslim süresi doldu.");

    const info = await service.saveAssignment(actor, form(courseId, { submissionType: "none" }));
    await expect(service.submitAssignment(student, { assignmentId: info.id, url: DRIVE })).rejects.toThrow(
      "Bu ödev için teslim gerekmiyor.",
    );

    const open = await service.saveAssignment(actor, form(courseId));
    await courseService.setCourseArchived(actor, { id: courseId, archived: true });
    await expect(service.submitAssignment(student, { assignmentId: open.id, url: DRIVE })).rejects.toThrow(
      "Teslim süresi doldu.",
    );
    const view = await service.getStudentAssignmentView(open.id, student.id);
    expect(view!.window).toEqual({ state: "closed" });
  });

  it("derste olmayan öğrenci ve taslak ödev için görünüm null (notFound), teslim reddedilir", async () => {
    const { actor, courseId, student } = await setup();
    const stranger = await createStudent();
    const published = await service.saveAssignment(actor, form(courseId));
    const draft = await service.saveAssignment(actor, form(courseId, { intent: "draft" }));

    expect(await service.getStudentAssignmentView(published.id, stranger.id)).toBeNull();
    expect(await service.getStudentAssignmentView(draft.id, student.id)).toBeNull();
    await expect(service.submitAssignment(stranger, { assignmentId: published.id, url: DRIVE })).rejects.toThrow(
      "Ödev bulunamadı.",
    );
  });

  it("puanlama: sınır kontrolü, boş puan siler, puanlama kapalıysa reddeder", async () => {
    const { actor, courseId, student } = await setup();
    const { id } = await service.saveAssignment(actor, form(courseId, { grading: "on", maxScore: "100" }));
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE });
    const [s] = await db.select().from(submissions).where(eq(submissions.assignmentId, id));
    const grade = (score: string, feedback = "") =>
      service.gradeSubmission(actor, { submissionId: s!.id, score: parseScore(score), feedback: feedback || null });

    await expect(grade("100,5")).rejects.toThrow("Puan 0 ile 100 arasında olmalı.");
    const ok = await grade("72,5", "iyi");
    expect(ok.score).toBe(72.5);
    expect(ok.gradedAt).toBeInstanceOf(Date);
    const cleared = await grade("");
    expect(cleared).toEqual({ score: null, gradedAt: null });
    const [after] = await db.select().from(submissions).where(eq(submissions.id, s!.id));
    expect(after!.score).toBeNull();

    const off = await service.saveAssignment(actor, form(courseId));
    await service.submitAssignment(student, { assignmentId: off.id, url: DRIVE });
    const [s2] = await db.select().from(submissions).where(eq(submissions.assignmentId, off.id));
    await expect(
      service.gradeSubmission(actor, { submissionId: s2!.id, score: 5, feedback: null }),
    ).rejects.toThrow("Bu ödev puanlanmıyor.");
  });

  function parseScore(v: string): number | null {
    if (!v) return null;
    return Number(v.replace(",", "."));
  }

  it("puan yayını: bildirim + audit; yayından sonra teslim değişmez; yayındaki puan güncellenir", async () => {
    const { actor, courseId, student } = await setup();
    const { id } = await service.saveAssignment(actor, form(courseId, { grading: "on", maxScore: "100" }));
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE });
    const [s] = await db.select().from(submissions).where(eq(submissions.assignmentId, id));

    expect(await service.publishScores(actor, { assignmentId: id })).toEqual({ count: 0 }); // nothing graded yet
    await service.gradeSubmission(actor, { submissionId: s!.id, score: 80, feedback: "Güzel" });
    expect(await service.publishScores(actor, { assignmentId: id })).toEqual({ count: 1 });
    expect(await service.publishScores(actor, { assignmentId: id })).toEqual({ count: 0 });

    expect(await notificationsOf(student.id, "submission.score_published")).toHaveLength(1);
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "submission.score_publish"), eq(auditLogs.targetId, id)));
    expect(logs).toHaveLength(1);
    expect(logs[0]!.metadata).toEqual({ count: 1 });

    await expect(service.submitAssignment(student, { assignmentId: id, url: DRIVE })).rejects.toThrow(
      "Puanınız yayınlandı, teslim artık değiştirilemez.",
    );

    const view = await service.getStudentAssignmentView(id, student.id);
    expect(view!.submission!.result).toEqual({ score: 80, maxScore: 100, feedback: "Güzel" });

    await service.gradeSubmission(actor, { submissionId: s!.id, score: 90, feedback: "Güzel" });
    const [after] = await db.select().from(submissions).where(eq(submissions.id, s!.id));
    expect(after!.score).toBe(90);
    expect(after!.scorePublishedAt).not.toBeNull();
  });

  it("başka eğitmen ödeve erişemez", async () => {
    const { actor, courseId, student } = await setup();
    const { id } = await service.saveAssignment(actor, form(courseId, { grading: "on", maxScore: "100" }));
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE });
    const [s] = await db.select().from(submissions).where(eq(submissions.assignmentId, id));
    const intruder = await createInstructor();
    const denied = "Bu derse erişiminiz yok.";

    await expect(service.saveAssignment(intruder, form(courseId))).rejects.toThrow(denied);
    await expect(service.saveAssignment(intruder, form(courseId, { id }))).rejects.toThrow(denied);
    await expect(service.deleteAssignment(intruder, { id })).rejects.toThrow(denied);
    await expect(service.gradeSubmission(intruder, { submissionId: s!.id, score: 5, feedback: null })).rejects.toThrow(
      denied,
    );
    await expect(service.publishScores(intruder, { assignmentId: id })).rejects.toThrow(denied);
    expect(await service.getAssignmentDetail(id, intruder.id)).toBeNull();
    expect(await service.listSubmissionHistory(s!.id, intruder.id)).toBeNull();
    expect(await service.buildSubmissionsCsv(id, intruder.id)).toBeNull();
  });

  it("listeler, sayaçlar, filtreler ve silme (cascade)", async () => {
    const { actor, courseId, student } = await setup();
    const second = await createStudent();
    const unregisteredNo = studentNo();
    await courseService.addRoster(actor, { courseId, text: `${second.no}\n${unregisteredNo}` });

    const draft = await service.saveAssignment(actor, form(courseId, { intent: "draft", title: "Taslak" }));
    const { id } = await service.saveAssignment(
      actor,
      form(courseId, { dueAt: "2026-10-14T23:59", lateAllowed: "on", grading: "on", maxScore: "100" }),
    );
    await service.submitAssignment(student, { assignmentId: id, url: DRIVE }, parseIstanbulLocal("2026-10-15T01:00"));
    await service.submitAssignment(second, { assignmentId: id, url: DRIVE }, parseIstanbulLocal("2026-10-14T10:00"));
    await service.submitAssignment(second, { assignmentId: id, url: DRIVE }, parseIstanbulLocal("2026-10-14T11:00"));
    const [subA] = await db.select().from(submissions).where(eq(submissions.studentId, second.id));
    await service.gradeSubmission(actor, { submissionId: subA!.id, score: 50, feedback: null });

    const list = await service.listAssignmentSummaries(courseId);
    expect(list.map((a) => a.id)).toEqual([draft.id, id]);
    expect(list[1]!.counts).toEqual({ roster: 3, submitted: 2, late: 1, graded: 1, published: 0 });

    const rosterCourse = (await service.getAssignmentDetail(id, actor.id))!.course.id;
    const q = (filter: "ungraded" | "missing" | "late" | "all") =>
      service.listSubmissionRows(id, rosterCourse, { filter }).then((p) => p.items);
    expect(await q("all")).toHaveLength(3);
    expect((await q("ungraded")).map((r) => r.studentNo)).toEqual([student.no]);
    const missing = await q("missing");
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ studentNo: unregisteredNo, registered: false });
    expect((await q("late")).map((r) => r.studentNo)).toEqual([student.no]);
    const withHistory = (await q("all")).find((r) => r.studentNo === second.no)!;
    expect(withHistory.submission!.historyCount).toBe(2);
    expect((await service.listSubmissionHistory(subA!.id, actor.id))!).toHaveLength(2);

    const csv = await service.buildSubmissionsCsv(id, actor.id);
    expect(csv!.filename).toBe("BIL201-odev-1-teslimler.csv");
    expect(csv!.content.startsWith("﻿")).toBe(true);
    const lines = csv!.content.trim().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("Numara;Ad Soyad;Durum");
    expect(lines.find((l) => l.includes(unregisteredNo))).toContain("Kayıt olmadı");
    expect(lines.find((l) => l.startsWith(student.no))).toContain("Geç teslim");

    await service.deleteAssignment(actor, { id });
    const gone = await db.select().from(submissions).where(eq(submissions.assignmentId, id));
    expect(gone).toHaveLength(0);
    const [deleted] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "assignment.delete"), eq(auditLogs.targetId, id)));
    expect(deleted).toMatchObject({ actorId: actor.id, targetType: "assignment" });
    expect(deleted!.metadata).toHaveProperty("title");
  });

  describe("listPendingGradingItems", () => {
    const at = new Date("2026-10-10T12:00:00Z");

    async function addStudents(actor: { id: string; schoolId: string }, courseId: string, n: number) {
      const list = [];
      for (let i = 0; i < n; i++) list.push(await createStudent());
      await courseService.addRoster(actor, { courseId, text: list.map((s) => `${s.no} Gizli Ad`).join("\n") });
      return list;
    }

    it("yalnız kendi, arşivsiz, puanlı, linkli, yayınlanmış ödevleri; sayılar doğru; sıra ungraded azalan sonra dueAt artan", async () => {
      const { actor, courseId } = await setup();
      const stranger = await setup();
      const [s1, s2, s3] = await addStudents(actor, courseId, 3);
      const mk = async (title: string, over: Partial<typeof assignments.$inferInsert> = {}) =>
        (
          await db
            .insert(assignments)
            .values({ courseId, title, status: "published", publishedAt: at, maxScore: 100, ...over })
            .returning()
        )[0]!;

      const many = await mk("Çok bekleyen", { dueAt: new Date("2026-10-20T00:00:00Z") });
      const soon = await mk("Yakın", { dueAt: new Date("2026-10-12T00:00:00Z") });
      const unpub = await mk("Yayınlanmamış puan", { dueAt: new Date("2026-10-11T00:00:00Z") });
      const clean = await mk("Hepsi yayınlandı");
      await mk("Teslim yok");
      await mk("Puansız", { maxScore: null });
      await mk("Taslak", { status: "draft", publishedAt: null });
      await mk("Bilgi", { submissionType: "none" });

      for (const s of [s1!, s2!, s3!]) await service.submitAssignment({ id: s.id }, { assignmentId: many.id, url: DRIVE }, at);
      for (const s of [s1!, s2!]) await service.submitAssignment({ id: s.id }, { assignmentId: soon.id, url: DRIVE }, at);
      await service.submitAssignment({ id: s1!.id }, { assignmentId: unpub.id, url: DRIVE }, at);
      await service.submitAssignment({ id: s2!.id }, { assignmentId: unpub.id, url: DRIVE }, at);
      await service.submitAssignment({ id: s1!.id }, { assignmentId: clean.id, url: DRIVE }, at);
      // many: one graded+published, so 2 ungraded; unpub: s1 scored but unpublished, s2 ungraded
      await db
        .update(submissions)
        .set({ score: 90, scorePublishedAt: at })
        .where(and(eq(submissions.assignmentId, many.id), eq(submissions.studentId, s1!.id)));
      await db
        .update(submissions)
        .set({ score: 60 })
        .where(and(eq(submissions.assignmentId, unpub.id), eq(submissions.studentId, s1!.id)));
      await db
        .update(submissions)
        .set({ score: 70, scorePublishedAt: at })
        .where(eq(submissions.assignmentId, clean.id));

      // another instructor's assignment never shows up
      const foreignAssignment = await db
        .insert(assignments)
        .values({ courseId: stranger.courseId, title: "Yabancı", status: "published", publishedAt: at, maxScore: 10 })
        .returning();
      await service.submitAssignment({ id: stranger.student.id }, { assignmentId: foreignAssignment[0]!.id, url: DRIVE }, at);

      const items = await service.listPendingGradingItems(actor.id);
      expect(items.map((i) => i.title)).toEqual(["Yakın", "Çok bekleyen", "Yayınlanmamış puan"]);
      expect(items.map((i) => [i.ungraded, i.unpublished])).toEqual([
        [2, 0],
        [2, 0],
        [1, 1],
      ]);
      expect(items[1]).toMatchObject({ assignmentId: many.id, course: { id: courseId, code: expect.any(String), name: "Veri Yapıları" } });

      const strangerItems = await service.listPendingGradingItems(stranger.actor.id);
      expect(strangerItems.map((i) => i.title)).toEqual(["Yabancı"]);
    });

    it("arşivli dersin ödevi listelenmez", async () => {
      const { actor, courseId, student } = await setup();
      const [a] = await db
        .insert(assignments)
        .values({ courseId, title: "Arşivde", status: "published", publishedAt: at, maxScore: 10 })
        .returning();
      await service.submitAssignment({ id: student.id }, { assignmentId: a!.id, url: DRIVE }, at);
      expect(await service.listPendingGradingItems(actor.id)).toHaveLength(1);
      await db.update(courses).set({ archivedAt: at }).where(eq(courses.id, courseId));
      expect(await service.listPendingGradingItems(actor.id)).toHaveLength(0);
    });
  });

  describe("link erişim kontrolü (fetch mock)", () => {
    const res = (status: number, location?: string) =>
      new Response(null, { status, headers: location ? { location } : undefined });

    it("2xx public, accounts.google.com yönlendirmesi private", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      spy.mockResolvedValueOnce(res(200));
      expect(await service.probeLinkAccess(DRIVE)).toBe("public");
      spy.mockResolvedValueOnce(res(302, "https://accounts.google.com/ServiceLogin?x=1"));
      expect(await service.probeLinkAccess(DRIVE)).toBe("private");
      expect(spy.mock.calls[0]![1]).toMatchObject({ redirect: "manual" });
    });

    it("allowlist içi yönlendirme en fazla 2 adım izlenir; dışarı çıkan unknown", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      spy.mockResolvedValueOnce(res(302, "https://docs.google.com/a"));
      spy.mockResolvedValueOnce(res(302, "https://drive.google.com/b"));
      spy.mockResolvedValueOnce(res(200));
      expect(await service.probeLinkAccess(DRIVE)).toBe("public");

      const spy2 = vi.spyOn(globalThis, "fetch");
      spy2.mockResolvedValueOnce(res(302, "https://docs.google.com/a"));
      spy2.mockResolvedValueOnce(res(302, "https://docs.google.com/b"));
      spy2.mockResolvedValueOnce(res(302, "https://docs.google.com/c"));
      expect(await service.probeLinkAccess(DRIVE)).toBe("unknown");

      spy2.mockResolvedValueOnce(res(302, "https://evil.example/x"));
      expect(await service.probeLinkAccess(DRIVE)).toBe("unknown");
    });

    it("allowlist dışı host için istek atılmaz; hata ve 4xx unknown", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      expect(await service.probeLinkAccess("https://github.com/a/b")).toBe("unknown");
      expect(await service.probeLinkAccess("http://drive.google.com/a")).toBe("unknown");
      expect(spy).not.toHaveBeenCalled();
      spy.mockResolvedValueOnce(res(404));
      expect(await service.probeLinkAccess(DRIVE)).toBe("unknown");
      spy.mockRejectedValueOnce(new Error("network"));
      expect(await service.probeLinkAccess(DRIVE)).toBe("unknown");
    });

    it("dakikada 20 istek sınırı: aşılınca unknown ve fetch çağrılmaz", async () => {
      const student = await createStudent();
      const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => res(200));
      for (let i = 0; i < 20; i++) expect(await service.checkSubmissionLink(student.id, DRIVE)).toBe("public");
      expect(await service.checkSubmissionLink(student.id, DRIVE)).toBe("unknown");
      expect(spy).toHaveBeenCalledTimes(20);
    });
  });
});
