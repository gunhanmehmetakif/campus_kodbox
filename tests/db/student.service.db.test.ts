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

  const submit = (studentId: string, assignmentId: string, at = hours(-1)) =>
    assignmentService.submitAssignment({ id: studentId }, { assignmentId, url: DRIVE }, at);

  it("başka öğrencinin dersi null döner (notFound), derse kayıtlı öğrenci görür; geçersiz id null", async () => {
    const { newCourse } = await setup();
    const mine = await createStudent();
    const other = await createStudent();
    const courseId = await newCourse([mine]);

    expect(await service.findStudentCourse(courseId, other.id)).toBeNull();
    expect(await service.findStudentCourse("not-a-uuid", mine.id)).toBeNull();
    expect(await service.listCourseFeed(courseId, other.id, { tab: "akis" })).toBeNull();
    expect(await service.listCourseAssignments(courseId, other.id, NOW, { filter: "bekleyen" })).toBeNull();

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
    const feed = await service.listCourseFeed(courseId, s.id, { tab: "akis" });
    expect(feed!.items).toHaveLength(0);
    expect(feed!.total).toBe(0);
    expect(await service.listCourseAssignments(courseId, s.id, NOW, { filter: "bekleyen" })).toHaveLength(0);
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

  it("akış: duyuru + materyal + ödev publishedAt azalan; materyaller sekmesi yalnız materyal; sayfalama", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    await addPost(courseId, { title: "Duyuru", publishedAt: hours(-10) });
    await addPost(courseId, {
      type: "material",
      title: "Materyal",
      bodyMd: "**ders**",
      links: [{ title: "Slayt", url: "https://example.com/s" }],
      publishedAt: hours(-30),
    });
    await addAssignment(courseId, { title: "Ödev", publishedAt: hours(-20) });

    const akis = await service.listCourseFeed(courseId, s.id, { tab: "akis" });
    expect(akis!.items.map((i) => i.title)).toEqual(["Duyuru", "Ödev", "Materyal"]);
    expect(akis!.items.map((i) => i.kind)).toEqual(["post", "assignment", "post"]);
    expect(akis!.items[2]).toMatchObject({ postType: "material", bodyMd: "**ders**", links: [{ title: "Slayt" }] });
    expect(akis!.total).toBe(3);

    const materyal = await service.listCourseFeed(courseId, s.id, { tab: "materyaller" });
    expect(materyal!.items.map((i) => i.title)).toEqual(["Materyal"]);
    expect(materyal!.total).toBe(1);

    for (let i = 0; i < 22; i++) await addPost(courseId, { title: `P${i}`, publishedAt: hours(-100 - i) });
    const p1 = await service.listCourseFeed(courseId, s.id, { tab: "akis", page: 1 });
    const p2 = await service.listCourseFeed(courseId, s.id, { tab: "akis", page: 2 });
    expect(p1!.items).toHaveLength(20);
    expect(p2!.items).toHaveLength(5);
    expect(p2!.total).toBe(25);
    expect(new Set([...p1!.items, ...p2!.items].map((i) => i.id)).size).toBe(25);
  });

  it("ödev filtreleri: bekleyen sırası, teslim ve puan kovaları, yayınlanmamış puan result: null", async () => {
    const { actor, newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);

    const closed = await addAssignment(courseId, { title: "Kapalı", dueAt: hours(-30) });
    const none = await addAssignment(courseId, { title: "Bilgi", submissionType: "none" });
    const endless = await addAssignment(courseId, { title: "Süresiz" });
    const late = await addAssignment(courseId, { title: "Geç", dueAt: hours(-2), lateAllowed: true });
    const later = await addAssignment(courseId, { title: "Sonra", dueAt: hours(40) });
    const soon = await addAssignment(courseId, { title: "Yakın", dueAt: hours(4) });
    const waiting = await addAssignment(courseId, { title: "Bekleyen puan", dueAt: hours(30), maxScore: 100 });
    const scored = await addAssignment(courseId, { title: "Puanlı", dueAt: hours(31), maxScore: 100 });

    let bekleyen = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "bekleyen" });
    expect(bekleyen!.map((i) => i.title)).toEqual([
      "Geç",
      "Yakın",
      "Bekleyen puan",
      "Puanlı",
      "Sonra",
      "Süresiz",
      "Bilgi",
      "Kapalı",
    ]);
    expect(bekleyen![0]!.window.state).toBe("late");
    expect(bekleyen!.find((i) => i.id === none.id)).toMatchObject({ submissionType: "none", window: { state: "no_submission" } });
    expect(bekleyen!.find((i) => i.id === closed.id)!.window.state).toBe("closed");
    void endless;
    void late;
    void later;
    void soon;

    await submit(s.id, waiting.id, hours(-3));
    await submit(s.id, scored.id, hours(-2));
    bekleyen = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "bekleyen" });
    expect(bekleyen!.map((i) => i.id)).not.toContain(waiting.id);

    // unpublished score: lands in "teslim" with result null, even when graded
    const [subWaiting] = await db.select().from(submissions).where(eq(submissions.assignmentId, waiting.id));
    await db.update(submissions).set({ score: 55, gradedAt: NOW }).where(eq(submissions.id, subWaiting!.id));
    const teslim = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "teslim" });
    expect(teslim!.map((i) => i.title)).toEqual(["Puanlı", "Bekleyen puan"]);
    expect(teslim!.every((i) => i.result === null && i.submittedAt !== null)).toBe(true);
    expect(await service.listCourseAssignments(courseId, s.id, NOW, { filter: "puan" })).toHaveLength(0);

    // publish one score
    const [subScored] = await db.select().from(submissions).where(eq(submissions.assignmentId, scored.id));
    await db
      .update(submissions)
      .set({ score: 80, gradedAt: NOW, gradedById: actor.id, scorePublishedAt: hours(-1) })
      .where(eq(submissions.id, subScored!.id));
    const puan = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "puan" });
    expect(puan!.map((i) => i.title)).toEqual(["Puanlı"]);
    expect(puan![0]!.result).toEqual({ score: 80, maxScore: 100 });
    const teslim2 = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "teslim" });
    expect(teslim2!.map((i) => i.title)).toEqual(["Bekleyen puan"]);
  });

  it("geç teslim edilen ödev isLate taşır", async () => {
    const { newCourse } = await setup();
    const s = await createStudent();
    const courseId = await newCourse([s]);
    const a = await addAssignment(courseId, { dueAt: hours(-5), lateAllowed: true });
    await submit(s.id, a.id, hours(-1));
    const teslim = await service.listCourseAssignments(courseId, s.id, NOW, { filter: "teslim" });
    expect(teslim).toHaveLength(1);
    expect(teslim![0]).toMatchObject({ isLate: true });
  });
});
