/**
 * Öğrenci servisi: gerçek veritabanı entegrasyon testi (docs/fazlar/F5-F6-ogrenci-bildirim.md bölüm 1).
 * Veritabanına erişilemezse test paketi atlanır. Her test kendi benzersiz verisini üretir.
 */
import { eq, inArray, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

describe.skipIf(!available)("student service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const courseService = await import("@/server/courses/service");
  const assignmentService = await import("@/server/assignments/service");
  const service = await import("@/server/student/service");
  const { users, terms, courses, assignments, posts, submissions, schools, rateLimits } = schema;

  const createdUserIds: string[] = [];
  const createdTermIds: string[] = [];

  const rnd = () => crypto.randomUUID();
  const studentNo = () => String(Math.floor(100_000_000 + Math.random() * 899_999_999));
  const NOW = new Date("2026-10-10T12:00:00Z");
  const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
  const DRIVE = "https://drive.google.com/file/d/abc/view";
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

  async function createStudent() {
    const no = studentNo();
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

  /** An instructor with one term; `newCourse` adds courses with the given students on the roster. */
  async function setup() {
    const actor = await createInstructor();
    const [term] = await db.insert(terms).values({ schoolId: school.id, name: `T-${rnd()}` }).returning();
    createdTermIds.push(term!.id);
    let n = 0;
    const newCourse = async (students: Array<{ no: string }>) => {
      const { id } = await courseService.createCourse(actor, {
        code: `bil ${200 + n++}`,
        name: "Veri Yapıları",
        termId: term!.id,
      });
      if (students.length > 0) {
        await courseService.addRoster(actor, { courseId: id, text: students.map((s) => `${s.no} Gizli Ad`).join("\n") });
      }
      return id;
    };
    return { actor, newCourse };
  }

  type AssignmentOver = Partial<typeof assignments.$inferInsert>;
  async function addAssignment(courseId: string, over: AssignmentOver = {}) {
    const [row] = await db
      .insert(assignments)
      .values({ courseId, title: "Ödev", status: "published", publishedAt: hours(-48), ...over })
      .returning();
    return row!;
  }

  async function addPost(courseId: string, over: Partial<typeof posts.$inferInsert> = {}) {
    const [row] = await db
      .insert(posts)
      .values({ courseId, type: "announcement", title: "Duyuru", status: "published", publishedAt: hours(-24), ...over })
      .returning();
    return row!;
  }

  const feed = (courseId: string, userId: string, filter: "tumu" | "odev" | "duyuru" | "materyal", page?: number) =>
    service.listCourseFeed(courseId, userId, NOW, { filter, page });
  const titles = (page: { items: Array<{ kind: string; title?: string; assignment?: { title: string } }> }) =>
    page.items.map((i) => i.title ?? i.assignment!.title);

  const submit = (studentId: string, assignmentId: string, at = hours(-1)) =>
    assignmentService.submitAssignment({ id: studentId }, { assignmentId, url: DRIVE }, at);

  it("başka öğrencinin dersi null döner (notFound), derse kayıtlı öğrenci görür; geçersiz id null", async () => {
    const { newCourse } = await setup();
    const mine = await createStudent();
    const other = await createStudent();
    const courseId = await newCourse([mine]);

    expect(await service.findStudentCourse(courseId, other.id)).toBeNull();
    expect(await service.findStudentCourse("not-a-uuid", mine.id)).toBeNull();
    expect(await feed(courseId, other.id, "tumu")).toBeNull();
    expect(await feed(courseId, other.id, "odev")).toBeNull();

    const view = await service.findStudentCourse(courseId, mine.id);
    expect(view).toMatchObject({ id: courseId, instructorName: "Test Eğitmen", archived: false });
    expect(JSON.stringify(view)).not.toContain("Gizli Ad");
  });

  it("taslak ödev ve gönderiler hiçbir listede görünmez", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    await addAssignment(courseId, { title: "Taslak", status: "draft", publishedAt: null });
    await addPost(courseId, { title: "Taslak duyuru", status: "draft", publishedAt: null });

    const dash = await service.getDashboard(s.id, NOW);
    expect(dash.upcoming).toHaveLength(0);
    expect(dash.announcements).toHaveLength(0);
    expect(dash.courses[0]!.pendingCount).toBe(0);
    for (const filter of ["tumu", "odev", "duyuru", "materyal"] as const) {
      const page = await feed(courseId, s.id, filter);
      expect(page!.items).toHaveLength(0);
      expect(page!.total).toBe(0);
    }
    expect(await service.listMyAssignmentCards(s.id, NOW)).toHaveLength(0);
  });

  it("yaklaşan teslimler: late üstte, süresiz sonda, kapalı pencere ve none tipi yok, pendingCount tutarlı", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    const later = await addAssignment(courseId, { title: "Sonra", dueAt: hours(48) });
    const soon = await addAssignment(courseId, { title: "Yakın", dueAt: hours(5) });
    const open = await addAssignment(courseId, { title: "Süresiz" });
    const late = await addAssignment(courseId, {
      title: "Geç",
      dueAt: hours(-2),
      lateAllowed: true,
      lateUntil: hours(10),
    });
    await addAssignment(courseId, { title: "Kapalı", dueAt: hours(-2) });
    await addAssignment(courseId, { title: "Kapalı geç", dueAt: hours(-20), lateAllowed: true, lateUntil: hours(-1) });
    await addAssignment(courseId, { title: "Bilgi", submissionType: "none", dueAt: hours(3) });

    const dash = await service.getDashboard(s.id, NOW);
    expect(dash.upcoming.map((u) => u.assignmentId)).toEqual([late.id, soon.id, later.id, open.id]);
    expect(dash.upcoming.map((u) => u.state)).toEqual(["late", "open", "open", "open"]);
    expect(dash.upcoming[0]).toMatchObject({ course: { id: courseId }, lateUntil: late.lateUntil });
    expect(dash.courses).toHaveLength(1);
    expect(dash.courses[0]).toMatchObject({ id: courseId, pendingCount: 4, archived: false, termName: expect.any(String) });
  });

  it("teslim edilmiş ödev yaklaşan listesinden ve pendingCount'tan düşer", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    const a = await addAssignment(courseId, { title: "Teslim", dueAt: hours(10) });
    await addAssignment(courseId, { title: "Bekleyen", dueAt: hours(20) });

    expect((await service.getDashboard(s.id, NOW)).courses[0]!.pendingCount).toBe(2);
    await submit(s.id, a.id);
    const dash = await service.getDashboard(s.id, NOW);
    expect(dash.upcoming.map((u) => u.title)).toEqual(["Bekleyen"]);
    expect(dash.courses[0]!.pendingCount).toBe(1);
  });

  it("başkasının teslimi bu öğrencinin bekleyenini etkilemez", async () => {
    const { newCourse } = await setup();
    const s1 = await createStudent();
    const s2 = await createStudent();
    const courseId = await newCourse([s1, s2]);
    const a = await addAssignment(courseId, { dueAt: hours(10) });
    await submit(s1.id, a.id);
    expect((await service.getDashboard(s2.id, NOW)).upcoming).toHaveLength(1);
    expect((await service.getDashboard(s1.id, NOW)).upcoming).toHaveLength(0);
  });

  it("arşivli ders upcoming ve duyurulara girmez, listPastCourses'ta çıkar", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const activeId = await newCourse([s]);
    const archivedId = await newCourse([s]);
    await addAssignment(archivedId, { dueAt: hours(10) });
    await addPost(archivedId, { title: "Eski duyuru" });
    await db.update(courses).set({ archivedAt: hours(-5) }).where(eq(courses.id, archivedId));

    const dash = await service.getDashboard(s.id, NOW);
    expect(dash.courses.map((c) => c.id)).toEqual([activeId]);
    expect(dash.upcoming).toHaveLength(0);
    expect(dash.announcements).toHaveLength(0);
    expect(dash.pastCourseCount).toBe(1);

    const past = await service.listPastCourseCards(s.id, NOW);
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({ id: archivedId, archived: true, pendingCount: 0 });
    const archivedView = await service.findStudentCourse(archivedId, s.id);
    expect(archivedView!.archived).toBe(true);
  });

  it("duyurular: son 5, yeni → eski, yalnız announcement", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    for (let i = 0; i < 7; i++) await addPost(courseId, { title: `D${i}`, publishedAt: hours(-100 + i) });
    await addPost(courseId, { type: "material", title: "Materyal", publishedAt: hours(-1) });

    const dash = await service.getDashboard(s.id, NOW);
    expect(dash.announcements.map((a) => a.title)).toEqual(["D6", "D5", "D4", "D3", "D2"]);
    expect(dash.announcements[0]!.course).toMatchObject({ id: courseId });
  });

  it("akış: filtreler, publishedAt azalan, ödev kartı, sayfalama; başka ders ve taslak dönmez", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    const otherCourse = await newCourse([s]);
    await addPost(courseId, { title: "Duyuru", publishedAt: hours(-10) });
    await addPost(courseId, {
      type: "material",
      title: "Materyal",
      bodyMd: "**ders**",
      links: [{ title: "Slayt", url: "https://example.com/s" }],
      publishedAt: hours(-30),
    });
    await addAssignment(courseId, { title: "Ödev", publishedAt: hours(-20), dueAt: hours(5) });
    await addAssignment(courseId, { title: "Taslak ödev", status: "draft", publishedAt: null });
    await addAssignment(otherCourse, { title: "Başka ders ödevi" });
    await addPost(otherCourse, { title: "Başka duyuru" });

    const tumu = await feed(courseId, s.id, "tumu");
    expect(titles(tumu!)).toEqual(["Duyuru", "Ödev", "Materyal"]);
    expect(tumu!.items.map((i) => i.kind)).toEqual(["post", "assignment", "post"]);
    expect(tumu!.items[2]).toMatchObject({ postType: "material", bodyMd: "**ders**", links: [{ title: "Slayt" }] });
    expect(tumu!.items[1]).toMatchObject({
      assignment: { title: "Ödev", group: "bekleyen", course: { id: courseId }, window: { state: "open" }, submission: null },
    });
    expect(tumu!.total).toBe(3);

    expect(titles((await feed(courseId, s.id, "materyal"))!)).toEqual(["Materyal"]);
    expect(titles((await feed(courseId, s.id, "duyuru"))!)).toEqual(["Duyuru"]);
    const odev = await feed(courseId, s.id, "odev");
    expect(titles(odev!)).toEqual(["Ödev"]);
    expect(odev!.total).toBe(1);

    for (let i = 0; i < 22; i++) await addPost(courseId, { title: `P${i}`, publishedAt: hours(-100 - i) });
    const p1 = await feed(courseId, s.id, "tumu", 1);
    const p2 = await feed(courseId, s.id, "tumu", 2);
    expect(p1!.items).toHaveLength(20);
    expect(p2!.items).toHaveLength(5);
    expect(p2!.total).toBe(25);
    const key = (i: NonNullable<typeof p1>["items"][number]) => (i.kind === "post" ? i.id : i.assignment.id);
    expect(new Set([...p1!.items, ...p2!.items].map(key)).size).toBe(25);
  });

  it("odev filtresi: grup sırası (bekleyen dueAt artan, teslim submittedAt azalan, puan/diğer publishedAt azalan), geçmiş toplu", async () => {
    const { actor, newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);

    await addAssignment(courseId, { title: "Kapalı", dueAt: hours(-30), publishedAt: hours(-60) });
    await addAssignment(courseId, { title: "Bilgi", submissionType: "none", publishedAt: hours(-50) });
    await addAssignment(courseId, { title: "Süresiz" });
    await addAssignment(courseId, { title: "Geç", dueAt: hours(-2), lateAllowed: true });
    await addAssignment(courseId, { title: "Sonra", dueAt: hours(40) });
    await addAssignment(courseId, { title: "Yakın", dueAt: hours(4) });
    const t1 = await addAssignment(courseId, { title: "Teslim eski", dueAt: hours(30), maxScore: 100 });
    const t2 = await addAssignment(courseId, { title: "Teslim yeni", dueAt: hours(31), maxScore: 100 });
    const scored = await addAssignment(courseId, { title: "Puanlı", dueAt: hours(32), maxScore: 100 });
    const scored2 = await addAssignment(courseId, {
      title: "Puanlı eski",
      dueAt: hours(33),
      maxScore: 100,
      publishedAt: hours(-100),
    });

    await submit(s.id, t1.id, hours(-5));
    await submit(s.id, t2.id, hours(-3));
    await submit(s.id, scored.id, hours(-4));
    await submit(s.id, scored2.id, hours(-4));
    await submit(s.id, scored2.id, hours(-2));
    for (const [a, score] of [
      [scored, 80],
      [scored2, 70],
    ] as const) {
      await db
        .update(submissions)
        .set({ score, gradedAt: NOW, gradedById: actor.id, scorePublishedAt: hours(-1) })
        .where(eq(submissions.assignmentId, a.id));
    }
    // t1 has an unpublished score: stays in "teslim" with result null
    await db.update(submissions).set({ score: 55, gradedAt: NOW }).where(eq(submissions.assignmentId, t1.id));

    const odev = await feed(courseId, s.id, "odev");
    expect(titles(odev!)).toEqual([
      "Geç",
      "Yakın",
      "Sonra",
      "Süresiz",
      "Teslim yeni",
      "Teslim eski",
      "Puanlı",
      "Puanlı eski",
      "Bilgi",
      "Kapalı",
    ]);
    expect(odev!.total).toBe(10);
    const cards = odev!.items.map((i) => (i.kind === "assignment" ? i.assignment : null)!);
    expect(cards.map((c) => c.group)).toEqual([
      "bekleyen",
      "bekleyen",
      "bekleyen",
      "bekleyen",
      "teslim",
      "teslim",
      "puan",
      "puan",
      "diger",
      "diger",
    ]);
    expect(cards[0]!.window.state).toBe("late");
    expect(cards.find((c) => c.title === "Teslim eski")!.submission!.result).toBeNull();
    expect(cards.find((c) => c.title === "Puanlı")!.submission!.result).toMatchObject({ score: 80, maxScore: 100 });
    expect(cards.find((c) => c.title === "Puanlı eski")!.submission!.history).toHaveLength(2);
    expect(cards.find((c) => c.title === "Bilgi")!.window.state).toBe("no_submission");
    expect(cards.find((c) => c.title === "Kapalı")!.window.state).toBe("closed");
  });

  it("listMyAssignmentCards: arşivli dersi ve taslağı dışlar, ders bilgisi taşır, grup sırasıyla gelir", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const outsider = await createStudent();
    const activeId = await newCourse([s]);
    const archivedId = await newCourse([s]);
    const foreignId = await newCourse([outsider]);
    const done = await addAssignment(activeId, { title: "Bitti", dueAt: hours(10) });
    await addAssignment(activeId, { title: "Bekleyen", dueAt: hours(20) });
    await addAssignment(activeId, { title: "Taslak", status: "draft", publishedAt: null });
    await addAssignment(archivedId, { title: "Arşiv ödevi" });
    await addAssignment(foreignId, { title: "Yabancı" });
    await db.update(courses).set({ archivedAt: hours(-5) }).where(eq(courses.id, archivedId));
    await submit(s.id, done.id);

    const mine = await service.listMyAssignmentCards(s.id, NOW);
    expect(mine.map((c) => c.title)).toEqual(["Bekleyen", "Bitti"]);
    expect(mine.map((c) => c.group)).toEqual(["bekleyen", "teslim"]);
    expect(mine[0]!.course).toMatchObject({ id: activeId, archived: false, name: "Veri Yapıları" });
    expect((await service.listMyAssignmentCards(outsider.id, NOW)).map((c) => c.title)).toEqual(["Yabancı"]);
  });

  it("geç teslim edilen ödev isLate taşır", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    const a = await addAssignment(courseId, { dueAt: hours(-5), lateAllowed: true });
    await submit(s.id, a.id, hours(-1));
    const odev = await feed(courseId, s.id, "odev");
    expect(odev!.items).toHaveLength(1);
    expect(odev!.items[0]).toMatchObject({ assignment: { group: "teslim", submission: { isLate: true } } });
  });
});
