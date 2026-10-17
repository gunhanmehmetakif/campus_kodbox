/**
 * Ders servisi: gerçek veritabanı entegrasyon testi (docs/fazlar/F2-F3-admin-ders.md bölüm 7).
 * Veritabanına erişilemezse test paketi atlanır. Her test kendi benzersiz verisini üretir.
 */
import { and, eq, inArray } from "drizzle-orm";
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

describe.skipIf(!available)("courses service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, decrypt, encrypt } = await import("@/lib/server/crypto");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const service = await import("@/server/courses/service");
  const { users, terms, courses, courseRoster, notifications, posts, schools } = schema;

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
    if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
    await db.$client.end({ timeout: 2 });
  });

  async function createInstructor() {
    const email = `c${rnd().slice(0, 8)}@${school.staffEmailDomain}`;
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

  async function createStudent(no = studentNo(), status: "active" | "disabled" = "active") {
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
        status,
      })
      .returning();
    createdUserIds.push(row!.id);
    return { id: row!.id, no };
  }

  async function createTerm() {
    const [row] = await db.insert(terms).values({ schoolId: school.id, name: `T-${rnd()}` }).returning();
    createdTermIds.push(row!.id);
    return row!.id;
  }

  async function setup() {
    const actor = await createInstructor();
    const termId = await createTerm();
    const { id } = await service.createCourse(actor, { code: "bil 101", name: "Programlama", termId });
    return { actor, termId, courseId: id };
  }

  const notificationsOf = (userId: string, type: string) =>
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, type)));

  it("ders oluşturur: kod büyük harfe çevrilir, aynı dönemde aynı kod reddedilir", async () => {
    const { actor, termId, courseId } = await setup();
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    expect(course!.code).toBe("BİL101");
    await expect(
      service.createCourse(actor, { code: "BİL 101", name: "Başka", termId }),
    ).rejects.toThrow("Bu dönemde bu kodla bir dersiniz zaten var.");
    // other instructor may use the same code
    const other = await createInstructor();
    await expect(service.createCourse(other, { code: "BİL101", name: "X", termId })).resolves.toHaveProperty("id");
  });

  it("roster: kayıtlı öğrenci bağlanır ve bildirim gider; sayılar doğru", async () => {
    const { actor, courseId } = await setup();
    const registered = await createStudent();
    const unregisteredNo = studentNo();
    const disabled = await createStudent(studentNo(), "disabled");

    const first = await service.addRoster(actor, {
      courseId,
      text: `${registered.no} Ayşe Yılmaz\n${unregisteredNo}\n${disabled.no}\nbozuk`,
    });
    expect(first).toEqual({ added: 3, updated: 0, existing: 0, invalid: ["bozuk"] });

    const rows = await db.select().from(courseRoster).where(eq(courseRoster.courseId, courseId));
    const linked = rows.find((r) => r.studentNoHash === blindIndex(registered.no));
    expect(linked!.userId).toBe(registered.id);
    expect(decrypt(linked!.displayNameEnc!)).toBe("Ayşe Yılmaz");
    expect(rows.find((r) => r.studentNoHash === blindIndex(unregisteredNo))!.userId).toBeNull();
    expect(rows.find((r) => r.studentNoHash === blindIndex(disabled.no))!.userId).toBeNull();

    const sent = await notificationsOf(registered.id, "course.enrolled");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.payload).toMatchObject({ courseId, courseCode: "BİL101" });

    // second run: same name -> existing, new name -> updated, new number -> added
    const second = await service.addRoster(actor, {
      courseId,
      text: `${registered.no} Ayşe Yılmaz\n${unregisteredNo} Yeni Ad\n${studentNo()}`,
    });
    expect(second).toMatchObject({ added: 1, updated: 1, existing: 1, invalid: [] });
    expect(await notificationsOf(registered.id, "course.enrolled")).toHaveLength(1);

    const page = await service.listRosterRows(courseId, {});
    expect(page.total).toBe(4);
    expect(page.items.find((r) => r.studentNo === unregisteredNo)).toMatchObject({
      displayName: "Yeni Ad",
      registered: false,
    });
    expect((await service.listRosterRows(courseId, { filter: "registered" })).total).toBe(1);
    expect((await service.listRosterRows(courseId, { studentNo: registered.no })).total).toBe(1);
  });

  it("roster: önceden eklenmiş numara sonradan kayıtlı öğrenciye bağlanır ve bildirim gider", async () => {
    const { actor, courseId } = await setup();
    const no = studentNo();
    await service.addRoster(actor, { courseId, text: no });
    const student = await createStudent(no);
    const result = await service.addRoster(actor, { courseId, text: no });
    expect(result).toMatchObject({ added: 0, updated: 0, existing: 1 });
    const [row] = await db.select().from(courseRoster).where(eq(courseRoster.courseId, courseId));
    expect(row!.userId).toBe(student.id);
    expect(await notificationsOf(student.id, "course.enrolled")).toHaveLength(1);
  });

  it("roster satırı silinir; başka dersin satırı silinemez", async () => {
    const a = await setup();
    const b = await setup();
    await service.addRoster(a.actor, { courseId: a.courseId, text: studentNo() });
    const [row] = await db.select().from(courseRoster).where(eq(courseRoster.courseId, a.courseId));
    await expect(service.removeRosterEntry(b.actor, { courseId: b.courseId, id: row!.id })).rejects.toThrow(
      "Öğrenci kaydı bulunamadı.",
    );
    await service.removeRosterEntry(a.actor, { courseId: a.courseId, id: row!.id });
    expect((await service.listRosterRows(a.courseId, {})).total).toBe(0);
  });

  it("başka eğitmenin dersine yazma reddedilir", async () => {
    const { courseId } = await setup();
    const intruder = await createInstructor();
    const denied = "Bu derse erişiminiz yok.";
    await expect(service.addRoster(intruder, { courseId, text: studentNo() })).rejects.toThrow(denied);
    await expect(service.updateCourse(intruder, { id: courseId, code: "X1", name: "Y" })).rejects.toThrow(denied);
    await expect(service.setCourseArchived(intruder, { id: courseId, archived: true })).rejects.toThrow(denied);
    await expect(
      service.savePost(intruder, { courseId, type: "announcement", title: "t", bodyMd: "", links: [], intent: "draft" }),
    ).rejects.toThrow(denied);
    await expect(service.deletePost(intruder, { courseId, id: rnd() })).rejects.toThrow(denied);
    expect(await service.findOwnedCourse(courseId, intruder.id)).toBeNull();
    expect(await service.getCourseDetail(courseId, intruder.id, school.id)).toBeNull();
  });

  it("arşivli derse yazma reddedilir; arşivden çıkarma çalışır", async () => {
    const { actor, courseId } = await setup();
    const post = await service.savePost(actor, {
      courseId,
      type: "announcement",
      title: "t",
      bodyMd: "",
      links: [],
      intent: "draft",
    });
    await service.setCourseArchived(actor, { id: courseId, archived: true });

    const archived = "Arşivlenmiş ders değiştirilemez.";
    await expect(service.addRoster(actor, { courseId, text: studentNo() })).rejects.toThrow(archived);
    await expect(service.updateCourse(actor, { id: courseId, code: "X1", name: "Y" })).rejects.toThrow(archived);
    await expect(
      service.savePost(actor, { courseId, type: "material", title: "t", bodyMd: "", links: [], intent: "publish" }),
    ).rejects.toThrow(archived);
    await expect(service.deletePost(actor, { courseId, id: post.id })).rejects.toThrow(archived);
    await expect(service.removeRosterEntry(actor, { courseId, id: rnd() })).rejects.toThrow(archived);

    expect((await service.listCoursesOf(actor.id, true)).map((c) => c.id)).toContain(courseId);
    await service.setCourseArchived(actor, { id: courseId, archived: false });
    expect((await service.listCoursesOf(actor.id, false)).map((c) => c.id)).toContain(courseId);
    await expect(service.updateCourse(actor, { id: courseId, code: "X1", name: "Y" })).resolves.toBeUndefined();
  });

  it("paylaşım: ilk yayında bildirim gider, güncellemede gitmez, yayın taslağa dönmez", async () => {
    const { actor, courseId } = await setup();
    const student = await createStudent();
    await service.addRoster(actor, { courseId, text: student.no });
    const base = { courseId, type: "announcement" as const, bodyMd: "metin", links: [] };

    const draft = await service.savePost(actor, { ...base, title: "Taslak", intent: "draft" });
    expect(await notificationsOf(student.id, "post.published")).toHaveLength(0);
    const [d] = await db.select().from(posts).where(eq(posts.id, draft.id));
    expect(d).toMatchObject({ status: "draft", publishedAt: null });

    await service.savePost(actor, { ...base, id: draft.id, title: "Taslak 2", intent: "draft" });
    expect(await notificationsOf(student.id, "post.published")).toHaveLength(0);

    await service.savePost(actor, { ...base, id: draft.id, title: "Yayın", intent: "publish" });
    const sent = await notificationsOf(student.id, "post.published");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.payload).toMatchObject({ postId: draft.id, postType: "announcement", title: "Yayın" });
    const [p] = await db.select().from(posts).where(eq(posts.id, draft.id));
    expect(p!.status).toBe("published");
    expect(p!.publishedAt).toBeInstanceOf(Date);

    // edits on a published post: no new notification, stays published even with intent draft
    await service.savePost(actor, { ...base, id: draft.id, title: "Yayın 2", intent: "publish" });
    await service.savePost(actor, {
      ...base,
      id: draft.id,
      title: "Yayın 3",
      links: [{ title: "Drive", url: "https://drive.google.com/a" }],
      intent: "draft",
    });
    expect(await notificationsOf(student.id, "post.published")).toHaveLength(1);
    const [after] = await db.select().from(posts).where(eq(posts.id, draft.id));
    expect(after).toMatchObject({ status: "published", title: "Yayın 3" });
    expect(after!.links).toHaveLength(1);
    expect(after!.publishedAt).toEqual(p!.publishedAt);

    // direct publish of a new post notifies once
    await service.savePost(actor, { ...base, title: "Direkt", intent: "publish" });
    expect(await notificationsOf(student.id, "post.published")).toHaveLength(2);
  });

  it("paylaşım listesi: taslaklar üstte; başka dersin paylaşımı güncellenemez/silinemez", async () => {
    const a = await setup();
    const b = await setup();
    const base = { type: "material" as const, bodyMd: "", links: [] };
    const pub = await service.savePost(a.actor, { ...base, courseId: a.courseId, title: "Yayın", intent: "publish" });
    const draft = await service.savePost(a.actor, { ...base, courseId: a.courseId, title: "Taslak", intent: "draft" });

    const list = await service.listPostRows(a.courseId, "material");
    expect(list.map((p) => p.id)).toEqual([draft.id, pub.id]);
    expect(await service.listPostRows(a.courseId, "announcement")).toEqual([]);

    await expect(
      service.savePost(b.actor, { ...base, courseId: b.courseId, id: pub.id, title: "Hack", intent: "draft" }),
    ).rejects.toThrow("İçerik bulunamadı.");
    await expect(service.deletePost(b.actor, { courseId: b.courseId, id: pub.id })).rejects.toThrow(
      "İçerik bulunamadı.",
    );
    expect(await service.findPostForInstructor(pub.id, b.actor.id)).toBeNull();
    expect((await service.findPostForInstructor(pub.id, a.actor.id))!.courseId).toBe(a.courseId);

    await service.deletePost(a.actor, { courseId: a.courseId, id: draft.id });
    expect(await service.listPostRows(a.courseId, "material")).toHaveLength(1);
    const [log] = await db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, "post.delete"), eq(schema.auditLogs.targetId, draft.id)));
    expect(log).toMatchObject({ actorId: a.actor.id, targetType: "post", metadata: { title: "Taslak", type: "material" } });
  });

  it("ders listesi sayıları: öğrenci ve kayıtlı sayısı", async () => {
    const { actor, courseId } = await setup();
    const student = await createStudent();
    await service.addRoster(actor, { courseId, text: `${student.no}\n${studentNo()}\n${studentNo()}` });
    const [row] = (await service.listCoursesOf(actor.id, false)).filter((c) => c.id === courseId);
    expect(row).toMatchObject({ studentCount: 3, registeredCount: 1, code: "BİL101" });
    const detail = await service.getCourseDetail(courseId, actor.id, school.id);
    expect(detail).toMatchObject({ studentCount: 3, registeredCount: 1, studentNoRegex: school.studentNoRegex });
  });
});
