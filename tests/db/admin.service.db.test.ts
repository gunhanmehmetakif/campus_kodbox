/**
 * Admin servisi — gerçek veritabanı entegrasyon testi (docs/fazlar/F2-F3-admin-ders.md bölüm 7).
 * Veritabanına erişilemezse test paketi atlanır. Aktif dönem gibi okul bazlı durumlar için her
 * çalışmada rastgele domain'li ayrı bir okul oluşturulur; diğer testlerin verisine dokunulmaz.
 */
import { eq, inArray } from "drizzle-orm";
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

describe.skipIf(!available)("admin service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { hashPassword, verifyPassword } = await import("@/lib/server/password");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const auth = await import("@/server/auth/service");
  const admin = await import("@/server/admin/service");
  const { auditLogs, courseRoster, courses, schools, sessions, terms, users } = schema;

  const rnd = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const studentNo = () => String(Math.floor(100_000_000 + Math.random() * 899_999_999));
  const PASSWORD = "Sifre1234";

  const createdUserIds: string[] = [];
  const createdSchoolIds: string[] = [];
  const createdTermIds: string[] = [];

  let school: typeof schools.$inferSelect;
  let actor: { id: string; schoolId: string };

  async function createSchool() {
    const tag = rnd();
    const [row] = await db
      .insert(schools)
      .values({
        slug: `t-${tag}`,
        name: `Test Okulu ${tag}`,
        studentEmailDomain: `ogr.${tag}.test`,
        staffEmailDomain: `${tag}.test`,
        studentNoRegex: "^\\d{6,12}$",
      })
      .returning();
    createdSchoolIds.push(row!.id);
    return row!;
  }

  async function createUser(
    s: typeof school,
    role: "admin" | "instructor" | "student",
    overrides: Partial<typeof users.$inferInsert> = {},
  ) {
    const no = studentNo();
    const email = role === "student" ? `${no}@${s.studentEmailDomain}` : `u${rnd()}@${s.staffEmailDomain}`;
    const [row] = await db
      .insert(users)
      .values({
        role,
        schoolId: s.id,
        emailEnc: encrypt(email),
        emailHash: blindIndex(email),
        studentNoEnc: role === "student" ? encrypt(no) : null,
        studentNoHash: role === "student" ? blindIndex(no) : null,
        displayName: role === "student" ? null : `Test ${role}`,
        passwordHash: await hashPassword(PASSWORD),
        status: "active",
        ...overrides,
      })
      .returning();
    createdUserIds.push(row!.id);
    return { user: row!, email, no };
  }

  async function createTerm(name = `Dönem ${rnd()}`) {
    const { id } = await admin.createTerm(actor, { name });
    createdTermIds.push(id);
    return id;
  }

  async function addSession(userId: string) {
    const id = `test-session-${rnd()}${rnd()}`;
    await db.insert(sessions).values({ id, userId, remember: true, expiresAt: new Date(Date.now() + 3_600_000) });
    return id;
  }

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle", migrationsTable: "__drizzle_migrations", migrationsSchema: "public" });
    school = await createSchool();
    actor = { id: (await createUser(school, "admin")).user.id, schoolId: school.id };
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.actorId, createdUserIds));
      await db.delete(courses).where(inArray(courses.instructorId, createdUserIds));
    }
    if (createdTermIds.length > 0) await db.delete(terms).where(inArray(terms.id, createdTermIds));
    if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
    if (createdSchoolIds.length > 0) {
      await db.delete(terms).where(inArray(terms.schoolId, createdSchoolIds));
      await db.delete(schools).where(inArray(schools.id, createdSchoolIds));
    }
    await db.$client.end({ timeout: 2 });
  });

  it("eğitmen oluşturma: geçici şifre ile giriş yapılır, mustChangePassword true, mail tekil", async () => {
    // authenticate() resolves the default school, so this instructor is created there.
    const defaultSchool = await getDefaultSchool();
    if (!defaultSchool) throw new Error("default school missing");
    const defaultAdmin = await createUser(defaultSchool, "admin");
    const defaultActor = { id: defaultAdmin.user.id, schoolId: defaultSchool.id };

    const local = `ders.${rnd()}`;
    const created = await admin.createInstructor(defaultActor, { local, displayName: "Ahmet Yılmaz" });
    createdUserIds.push(created.id);
    expect(created.tempPassword).toHaveLength(12);

    const [row] = await db.select().from(users).where(eq(users.id, created.id));
    expect(row?.mustChangePassword).toBe(true);
    expect(row?.role).toBe("instructor");
    expect(row?.status).toBe("active");
    expect(await verifyPassword(row!.passwordHash!, created.tempPassword)).toBe(true);

    const login = await auth.authenticate({
      kind: "staff",
      local,
      password: created.tempPassword,
    });
    expect(login).toMatchObject({ ok: true, userId: created.id, role: "instructor", mustChangePassword: true });

    await expect(admin.createInstructor(defaultActor, { local, displayName: "Başkası" })).rejects.toThrow(
      "Bu mail adresiyle bir hesap zaten var.",
    );

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.targetId, created.id));
    expect(logs.map((l) => l.action)).toContain("instructor.create");
    // The temporary password never reaches the audit log.
    expect(JSON.stringify(logs)).not.toContain(created.tempPassword);
  });

  it("şifre sıfırlama: yeni geçici şifre, oturumlar düşer, mustChangePassword true", async () => {
    const { id } = await admin.createInstructor(actor, { local: `x${rnd()}`, displayName: "Eğitmen Bir" });
    createdUserIds.push(id);
    await db.update(users).set({ mustChangePassword: false }).where(eq(users.id, id));
    await addSession(id);

    const { tempPassword } = await admin.resetInstructorPassword(actor, id);
    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row?.mustChangePassword).toBe(true);
    expect(await verifyPassword(row!.passwordHash!, tempPassword)).toBe(true);
    expect(await db.select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0);
  });

  it("devre dışı bırakınca oturumlar düşer, etkinleştirme geri alır", async () => {
    const instructor = await createUser(school, "instructor");
    const student = await createUser(school, "student");
    for (const u of [instructor, student]) {
      await addSession(u.user.id);
      await addSession(u.user.id);
      await admin.setUserStatus(actor, { id: u.user.id, status: "disabled" });
      const [row] = await db.select().from(users).where(eq(users.id, u.user.id));
      expect(row?.status).toBe("disabled");
      expect(row?.disabledAt).not.toBeNull();
      expect(await db.select().from(sessions).where(eq(sessions.userId, u.user.id))).toHaveLength(0);

      await admin.setUserStatus(actor, { id: u.user.id, status: "active" });
      const [again] = await db.select().from(users).where(eq(users.id, u.user.id));
      expect(again?.status).toBe("active");
      expect(again?.disabledAt).toBeNull();
    }
    const actions = (await db.select().from(auditLogs).where(eq(auditLogs.actorId, actor.id))).map((l) => l.action);
    expect(actions).toContain("user.disable");
    expect(actions).toContain("user.enable");
  });

  it("admin kendini veya başka bir admin'i devre dışı bırakamaz; başka okulun kullanıcısına dokunamaz", async () => {
    await expect(admin.setUserStatus(actor, { id: actor.id, status: "disabled" })).rejects.toThrow(
      "Kendi hesabınızı devre dışı bırakamazsınız.",
    );
    const otherAdmin = await createUser(school, "admin");
    await expect(admin.setUserStatus(actor, { id: otherAdmin.user.id, status: "disabled" })).rejects.toThrow(
      admin.AdminError,
    );
    const [row] = await db.select().from(users).where(eq(users.id, otherAdmin.user.id));
    expect(row?.status).toBe("active");

    const foreignSchool = await createSchool();
    const foreign = await createUser(foreignSchool, "instructor");
    await expect(admin.setUserStatus(actor, { id: foreign.user.id, status: "disabled" })).rejects.toThrow(
      "Kullanıcı bulunamadı.",
    );
    await expect(admin.updateInstructor(actor, { id: foreign.user.id, displayName: "Hack" })).rejects.toThrow(
      "Kullanıcı bulunamadı.",
    );
  });

  it("aktif dönem değişimi atomik: her zaman tek aktif dönem kalır", async () => {
    const s = await createSchool();
    const a = { id: (await createUser(s, "admin")).user.id, schoolId: s.id };
    const t1 = (await admin.createTerm(a, { name: "Güz" })).id;
    const t2 = (await admin.createTerm(a, { name: "Bahar" })).id;
    await expect(admin.createTerm(a, { name: "Güz" })).rejects.toThrow("Bu dönem zaten var.");

    await admin.setActiveTerm(a, t1);
    await admin.setActiveTerm(a, t2);
    let rows = await admin.listTerms(s.id);
    expect(rows.filter((t) => t.isActive).map((t) => t.id)).toEqual([t2]);

    // Concurrent switches must never leave two (or zero) active terms.
    await Promise.allSettled([admin.setActiveTerm(a, t1), admin.setActiveTerm(a, t2), admin.setActiveTerm(a, t1)]);
    rows = await admin.listTerms(s.id);
    expect(rows.filter((t) => t.isActive)).toHaveLength(1);

    const dash = await admin.getDashboard(s.id);
    expect(dash.activeTerm?.id).toBe(rows.find((t) => t.isActive)!.id);
  });

  it("dönem arşivleme: yalnız arşivlenmemiş dersler sayılır", async () => {
    const termId = await createTerm();
    const otherTermId = await createTerm();
    const instructor = await createUser(school, "instructor");
    const mk = async (code: string, term = termId, archivedAt: Date | null = null) =>
      void (await db.insert(courses).values({ instructorId: instructor.user.id, termId: term, code, name: code, archivedAt }));
    await mk("AAA101");
    await mk("AAA102");
    await mk("AAA103", termId, new Date());
    await mk("BBB101", otherTermId);

    const before = (await admin.listTerms(school.id)).find((t) => t.id === termId);
    expect(before).toMatchObject({ courseCount: 3, activeCourseCount: 2 });

    expect(await admin.archiveTermCourses(actor, termId)).toEqual({ count: 2 });
    expect(await admin.archiveTermCourses(actor, termId)).toEqual({ count: 0 });

    const after = (await admin.listTerms(school.id)).find((t) => t.id === termId);
    expect(after).toMatchObject({ courseCount: 3, activeCourseCount: 0 });
    const untouched = (await admin.listTerms(school.id)).find((t) => t.id === otherTermId);
    expect(untouched?.activeCourseCount).toBe(1);

    const hidden = await admin.listCourses(school.id, { termId });
    expect(hidden.total).toBe(0);
    const shown = await admin.listCourses(school.id, { termId, archived: true });
    expect(shown.total).toBe(3);
    expect(shown.items[0]?.termName).toBeTruthy();
  });

  it("öğrenci listesi: numara maskeli döner, ham numara sızmaz, tam numara ile aranır", async () => {
    const student = await createUser(school, "student");
    const { maskStudentNo } = await import("@/lib/mask");

    const found = await admin.listStudents(school.id, { studentNo: ` ${student.no} ` });
    expect(found.total).toBe(1);
    expect(found.items[0]).toMatchObject({ id: student.user.id, studentNoMasked: maskStudentNo(student.no) });
    expect(JSON.stringify(found)).not.toContain(student.no);

    const partial = await admin.listStudents(school.id, { studentNo: student.no.slice(0, 5) });
    expect(partial.total).toBe(0);

    const all = await admin.listStudents(school.id, {});
    expect(JSON.stringify(all)).not.toContain(student.no);

    await db.insert(courseRoster).values({
      courseId: (await seedCourse()).id,
      studentNoHash: blindIndex(student.no),
      studentNoEnc: encrypt(student.no),
      userId: student.user.id,
    });
    const withCourse = await admin.listStudents(school.id, { studentNo: student.no });
    expect(withCourse.items[0]?.courseCount).toBe(1);
  });

  async function seedCourse() {
    const termId = await createTerm();
    const instructor = await createUser(school, "instructor");
    const [row] = await db
      .insert(courses)
      .values({ instructorId: instructor.user.id, termId, code: `C${rnd()}`, name: "Ders" })
      .returning();
    return row!;
  }

  it("eğitmen listesi: görünen ad araması, durum filtresi, tam mail", async () => {
    const s = await createSchool();
    const a = { id: (await createUser(s, "admin")).user.id, schoolId: s.id };
    const tag = rnd();
    const one = await admin.createInstructor(a, { local: `bir.${tag}`, displayName: `Zeynep ${tag}` });
    const two = await admin.createInstructor(a, { local: `iki.${tag}`, displayName: `Mehmet ${tag}` });
    createdUserIds.push(one.id, two.id);
    await admin.setUserStatus(a, { id: two.id, status: "disabled" });

    const byName = await admin.listInstructors(s.id, { q: `zeynep ${tag}` });
    expect(byName.items.map((i) => i.id)).toEqual([one.id]);
    expect(byName.items[0]?.email).toBe(`bir.${tag}@${s.staffEmailDomain}`);
    expect(byName.items[0]?.mustChangePassword).toBe(true);

    const disabled = await admin.listInstructors(s.id, { status: "disabled" });
    expect(disabled.items.map((i) => i.id)).toEqual([two.id]);

    const literal = await admin.listInstructors(s.id, { q: "%" });
    expect(literal.total).toBe(0);
  });

  it("okul ve denetim: regex güncellenir, denetim kaydı etiketli ve maskeli listelenir", async () => {
    const s = await createSchool();
    const adminUser = await createUser(s, "admin");
    const a = { id: adminUser.user.id, schoolId: s.id };
    await admin.updateSchool(a, { name: "Yeni Ad", studentNoRegex: "^\\d{9}$" });
    const settings = await admin.getSchool(s.id);
    expect(settings).toMatchObject({
      name: "Yeni Ad",
      studentNoRegex: "^\\d{9}$",
      studentEmailDomain: s.studentEmailDomain,
      staffEmailDomain: s.staffEmailDomain,
    });

    const termId = (await admin.createTerm(a, { name: "Denetim Dönemi" })).id;
    createdTermIds.push(termId);

    const logs = await admin.listAuditLogs(s.id, { action: "term.create" });
    const mine = logs.items.find((l) => l.targetLabel === "Denetim Dönemi");
    expect(mine).toMatchObject({ actionLabel: "Dönem oluşturuldu", actorLabel: "Test admin" });

    const schoolLogs = await admin.listAuditLogs(s.id, { action: "school.update" });
    expect(schoolLogs.items.some((l) => l.targetLabel === "Yeni Ad")).toBe(true);
  });

  it("dashboard sayaçları okula göre sayılır", async () => {
    const s = await createSchool();
    const a = { id: (await createUser(s, "admin")).user.id, schoolId: s.id };
    expect(await admin.getDashboard(s.id)).toEqual({
      instructorCount: 0,
      activeStudentCount: 0,
      activeCourseCount: 0,
      activeTerm: null,
    });
    const instr = await createUser(s, "instructor");
    await createUser(s, "student");
    await createUser(s, "student", { status: "disabled" });
    const termId = (await admin.createTerm(a, { name: "Güz" })).id;
    await admin.setActiveTerm(a, termId);
    await db.insert(courses).values({ instructorId: instr.user.id, termId, code: "X1", name: "X" });
    const dash = await admin.getDashboard(s.id);
    expect(dash).toMatchObject({ instructorCount: 1, activeStudentCount: 1, activeCourseCount: 1 });
    expect(dash.activeTerm?.name).toBe("Güz");
  });
});
