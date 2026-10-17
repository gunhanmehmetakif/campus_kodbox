/**
 * Kimlik servisi — gerçek veritabanı entegrasyon testi (docs/fazlar/F1-kimlik.md bölüm 8).
 * Veritabanına erişilemezse test paketi atlanır. Mail gönderimi yakalanır, hiçbir şey gönderilmez.
 */
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; text: string; html: string }[] = [];

vi.mock("@/lib/server/mail", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/mail")>();
  return {
    ...original,
    sendMail: vi.fn(async (input: { to: string; subject: string; text: string; html: string }) => {
      sent.push(input);
      return { ok: true as const, id: null };
    }),
  };
});

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

describe.skipIf(!available)("auth service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { hashPassword } = await import("@/lib/server/password");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const service = await import("@/server/auth/service");
  const { RATE_LIMITS } = await import("@/lib/server/rate-limit");
  const { users, sessions, courseRoster, courses, terms, emailTokens, oauthAccounts, schools } = schema;

  const createdUserIds: string[] = [];
  const createdTermIds: string[] = [];
  const PASSWORD = "Kirmizi-Elma7";

  const rnd = () => crypto.randomUUID();
  const ip = () => `test-${rnd()}`;
  const studentNo = () => String(Math.floor(100_000_000 + Math.random() * 899_999_999));

  let school: Awaited<ReturnType<typeof getDefaultSchool>> & object;

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

  async function createStaff(overrides: Partial<typeof users.$inferInsert> = {}) {
    const email = `t${rnd().slice(0, 8)}@${school.staffEmailDomain}`;
    const [row] = await db
      .insert(users)
      .values({
        role: "instructor",
        schoolId: school.id,
        emailEnc: encrypt(email),
        emailHash: blindIndex(email),
        displayName: "Test Eğitmen",
        passwordHash: await hashPassword(PASSWORD),
        status: "active",
        ...overrides,
      })
      .returning();
    createdUserIds.push(row!.id);
    return { user: row!, email, local: email.split("@")[0]! };
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
        passwordHash: await hashPassword(PASSWORD),
        status: "active",
      })
      .returning();
    createdUserIds.push(row!.id);
    return { user: row!, email, no };
  }

  async function addSession(userId: string) {
    const id = `test-session-${rnd()}`;
    await db.insert(sessions).values({ id, userId, remember: true, expiresAt: new Date(Date.now() + 3_600_000) });
    return id;
  }

  /** Last captured mail to `to`, plus the raw token in its link. */
  function lastMail(to: string) {
    const mail = [...sent].reverse().find((m) => m.to === to);
    if (!mail) throw new Error(`no mail sent to ${to}`);
    const match = /\/(dogrula|sifre-sifirla)\/(\S+)/.exec(mail.text);
    if (!match) throw new Error("no link in mail");
    return { ...mail, kind: match[1]!, token: decodeURIComponent(match[2]!) };
  }

  async function register(no: string) {
    const outcome = await service.requestRegistration({ local: no, ip: ip() });
    return outcome;
  }

  it("kayıt, doğrulama ve roster eşleşmesi: kullanıcı aktif olur", async () => {
    const no = studentNo();
    const email = `${no}@${school.studentEmailDomain}`;

    // An instructor already added the number to a course.
    const { user: instructor } = await createStaff();
    const [term] = await db.insert(terms).values({ schoolId: school.id, name: `T-${rnd()}` }).returning();
    createdTermIds.push(term!.id);
    const [course] = await db
      .insert(courses)
      .values({ instructorId: instructor.id, termId: term!.id, code: "BIL101", name: "Test Dersi" })
      .returning();
    await db.insert(courseRoster).values({
      courseId: course!.id,
      studentNoHash: blindIndex(no),
      studentNoEnc: encrypt(no),
    });

    expect(await register(no)).toEqual({ status: "sent" });
    const mail = lastMail(email);
    expect(mail.kind).toBe("dogrula");
    expect(mail.subject).toContain("Kodbox Campus");
    expect(mail.text).toContain("Bu isteği siz yapmadıysanız dikkate almayın.");

    // Before completion no user exists and the token is valid.
    expect(await service.verifyTokenState(mail.token)).toEqual({ status: "valid", email });
    const [before] = await db.select().from(users).where(eq(users.emailHash, blindIndex(email)));
    expect(before).toBeUndefined();

    // A common password is refused without consuming the token.
    expect(await service.completeRegistration({ token: mail.token, password: "Password123" })).toEqual({
      ok: false,
      reason: "common_password",
    });
    expect(await service.verifyTokenState(mail.token)).toEqual({ status: "valid", email });

    const done = await service.completeRegistration({ token: mail.token, password: PASSWORD });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    createdUserIds.push(done.userId);

    const [created] = await db.select().from(users).where(eq(users.id, done.userId));
    expect(created).toMatchObject({ role: "student", status: "active", mustChangePassword: false });
    expect(created!.kvkkAcceptedAt).toBeInstanceOf(Date);
    expect(created!.passwordHash).toMatch(/^\$argon2id\$/);

    const [rosterRow] = await db.select().from(courseRoster).where(eq(courseRoster.courseId, course!.id));
    expect(rosterRow!.userId).toBe(done.userId);
  });

  it("aynı numarayla ikinci kayıtta 'zaten hesabınız var' maili gider, sonuç aynıdır", async () => {
    const { email, no } = await createStudent();
    const before = sent.length;

    expect(await register(no)).toEqual({ status: "sent" });
    expect(sent.length).toBe(before + 1);
    const mail = lastMail(email);
    expect(mail.subject).toContain("Zaten hesabınız var");
    expect(mail.kind).toBe("sifre-sifirla");
    expect((await service.resetTokenState(mail.token)).status).toBe("valid");
  });

  it("kayıt sonucu nötrdür: geçersiz biçim hariç hep 'sent', IP limiti ayrı raporlanır", async () => {
    expect(await service.requestRegistration({ local: "abc", ip: ip() })).toEqual({ status: "invalid_input" });
    const limitedIp = ip();
    const outcomes = [];
    const max = RATE_LIMITS.authRequestPerIp.limit;
    for (let i = 0; i < max + 1; i++) outcomes.push(await service.requestRegistration({ local: studentNo(), ip: limitedIp }));
    expect(outcomes.slice(0, max).every((o) => o.status === "sent")).toBe(true);
    expect(outcomes[max]!.status).toBe("ip_limited");
  });

  it("tekrar gönderme 60 sn bekleme süresine tabidir", async () => {
    const no = studentNo();
    expect((await service.requestRegistration({ local: no, ip: ip(), cooldown: true })).status).toBe("sent");
    const second = await service.requestRegistration({ local: no, ip: ip(), cooldown: true });
    expect(second.status).toBe("cooldown");
    if (second.status === "cooldown") expect(second.retryAfter).toBeGreaterThan(0);
  });

  it("yeni doğrulama linki eskisini geçersiz kılar", async () => {
    const no = studentNo();
    const email = `${no}@${school.studentEmailDomain}`;
    await register(no);
    const older = lastMail(email);
    await register(no);
    const newer = lastMail(email);
    expect((await service.verifyTokenState(older.token)).status).toBe("used");
    expect((await service.verifyTokenState(newer.token)).status).toBe("valid");
  });

  it("kullanılmış, süresi dolmuş ve geçersiz token reddedilir", async () => {
    const no = studentNo();
    const email = `${no}@${school.studentEmailDomain}`;
    await register(no);
    const { token } = lastMail(email);

    const first = await service.completeRegistration({ token, password: PASSWORD });
    expect(first.ok).toBe(true);
    if (first.ok) createdUserIds.push(first.userId);

    expect(await service.completeRegistration({ token, password: PASSWORD })).toEqual({ ok: false, reason: "used" });
    expect((await service.verifyTokenState(token)).status).toBe("used");

    const no2 = studentNo();
    const email2 = `${no2}@${school.studentEmailDomain}`;
    await register(no2);
    const expired = lastMail(email2);
    await db
      .update(emailTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailTokens.tokenHash, (await import("@/lib/server/crypto")).sha256Hex(expired.token)));
    expect(await service.completeRegistration({ token: expired.token, password: PASSWORD })).toEqual({
      ok: false,
      reason: "expired",
    });

    expect(await service.verifyTokenState("garbage-token")).toEqual({ status: "invalid" });
    expect(await service.resetTokenState(token)).toEqual({ status: "invalid" });
  });

  it("aynı token eşzamanlı kullanılırsa yalnız biri başarılı olur", async () => {
    const no = studentNo();
    const email = `${no}@${school.studentEmailDomain}`;
    await register(no);
    const { token } = lastMail(email);

    const results = await Promise.all([
      service.completeRegistration({ token, password: PASSWORD }),
      service.completeRegistration({ token, password: PASSWORD }),
      service.completeRegistration({ token, password: PASSWORD }),
    ]);
    const winners = results.filter((r) => r.ok);
    expect(winners).toHaveLength(1);
    const winner = winners[0];
    if (winner?.ok) createdUserIds.push(winner.userId);
  });

  it("5 hatalı girişten sonra hesap kilitlenir (doğru şifre bile geçmez)", async () => {
    const { local } = await createStaff();
    const attempt = (password: string) => service.authenticate({ kind: "staff", local, password });

    const wrong = [];
    for (let i = 0; i < 5; i++) wrong.push(await attempt("yanlis-sifre1"));
    expect(wrong).toEqual([
      { ok: false, reason: "invalid" },
      { ok: false, reason: "invalid" },
      { ok: false, reason: "invalid", attemptsLeft: 2 },
      { ok: false, reason: "invalid", attemptsLeft: 1 },
      expect.objectContaining({ ok: false, reason: "locked" }),
    ]);
    const last = wrong[4];
    if (last && !last.ok && last.reason === "locked") expect(last.retryAfter).toBeGreaterThan(0);
    const locked = await attempt(PASSWORD);
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.reason).toBe("locked");
  });

  it("giriş IP bütçesi: yalnız başarısız denemeler sayılır, bütçe dolunca engellenir", async () => {
    const loginIp = ip();
    expect((await service.checkLoginIpBudget(loginIp)).limited).toBe(false);
    for (let i = 0; i < RATE_LIMITS.loginPerIp.limit - 1; i++) await service.recordLoginIpFailure(loginIp);
    expect((await service.checkLoginIpBudget(loginIp)).limited).toBe(false);
    await service.recordLoginIpFailure(loginIp);
    const limited = await service.checkLoginIpBudget(loginIp);
    expect(limited.limited).toBe(true);
    expect(limited.retryAfter).toBeGreaterThan(0);

    // A successful login does not touch the IP budget.
    const { local } = await createStaff();
    const freshIp = ip();
    expect((await service.authenticate({ kind: "staff", local, password: PASSWORD })).ok).toBe(true);
    expect((await service.checkLoginIpBudget(freshIp)).count).toBe(0);
  });

  it("kalan hak sayacı olmayan hesapta da aynı şekilde işler", async () => {
    const local = `yok${rnd().slice(0, 8)}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await service.authenticate({ kind: "staff", local, password: "yanlis-sifre1" }));
    expect(results.map((r) => (r.ok || r.reason !== "invalid" ? null : (r.attemptsLeft ?? null)))).toEqual([null, null, 2, 1]);
  });

  it("giriş: doğru şifre oturum bilgisi döner; yanlış şifre, olmayan ve devre dışı hesap aynı genel hatayı alır", async () => {
    const { local, user } = await createStaff();
    const ok = await service.authenticate({ kind: "staff", local, password: PASSWORD });
    expect(ok).toEqual({ ok: true, userId: user.id, role: "instructor", mustChangePassword: false });

    const wrong = await service.authenticate({ kind: "staff", local, password: "yanlis1234" });
    const missing = await service.authenticate({ kind: "staff", local: `yok${rnd().slice(0, 6)}`, password: PASSWORD });
    const foreign = await service.authenticate({ kind: "staff", local: "x@gmail.com", password: PASSWORD });
    expect([wrong, missing, foreign]).toEqual(Array(3).fill({ ok: false, reason: "invalid" }));

    const disabled = await createStaff({ status: "disabled" });
    expect(await service.authenticate({ kind: "staff", local: disabled.local, password: PASSWORD })).toEqual({
      ok: false,
      reason: "invalid",
    });

    // Pasting the full student email on the staff tab selects the right kind.
    const student = await createStudent();
    const pasted = await service.authenticate({ kind: "staff", local: student.email, password: PASSWORD });
    expect(pasted.ok).toBe(true);
  });

  it("şifre sıfırlama: eski oturumlar düşer, mustChangePassword false olur, link tek kullanımlıktır", async () => {
    const { user, local, email } = await createStaff({ mustChangePassword: true });
    const s1 = await addSession(user.id);
    const s2 = await addSession(user.id);

    expect(await service.requestPasswordReset({ kind: "staff", local, ip: ip() })).toEqual({ status: "sent" });
    const mail = lastMail(email);
    expect(mail.kind).toBe("sifre-sifirla");
    expect(mail.subject).toContain("Şifre sıfırlama");

    expect(await service.resetPassword({ token: mail.token, password: "Sifre12345" })).toEqual({
      ok: false,
      reason: "common_password",
    });
    expect((await service.resetTokenState(mail.token)).status).toBe("valid");

    const newPassword = "YeniSifre99";
    const result = await service.resetPassword({ token: mail.token, password: newPassword });
    expect(result).toEqual({ ok: true, userId: user.id, role: "instructor" });

    const remaining = await db.select().from(sessions).where(inArray(sessions.id, [s1, s2]));
    expect(remaining).toHaveLength(0);
    const [after] = await db.select().from(users).where(eq(users.id, user.id));
    expect(after!.mustChangePassword).toBe(false);

    expect(await service.resetPassword({ token: mail.token, password: "Baska12345" })).toEqual({
      ok: false,
      reason: "used",
    });
    expect((await service.authenticate({ kind: "staff", local, password: newPassword })).ok).toBe(true);
    expect((await service.authenticate({ kind: "staff", local, password: PASSWORD })).ok).toBe(false);
  });

  it("şifremi unuttum: olmayan ve devre dışı hesapta mail gitmez, sonuç yine 'sent'", async () => {
    const before = sent.length;
    expect(await service.requestPasswordReset({ kind: "staff", local: `yok${rnd().slice(0, 6)}`, ip: ip() })).toEqual({
      status: "sent",
    });
    const disabled = await createStaff({ status: "disabled" });
    expect(await service.requestPasswordReset({ kind: "staff", local: disabled.local, ip: ip() })).toEqual({
      status: "sent",
    });
    expect(sent.length).toBe(before);
  });

  it("şifre değiştirme: mustChangePassword false olur, diğer oturumlar düşer, mevcut oturum kalır", async () => {
    const { user } = await createStaff({ mustChangePassword: true });
    const current = await addSession(user.id);
    const other = await addSession(user.id);

    expect(
      await service.changePassword({ userId: user.id, sessionId: current, currentPassword: "yanlis1234", newPassword: "Yeni123456" }),
    ).toEqual({ ok: false, reason: "wrong_current" });
    expect(
      await service.changePassword({ userId: user.id, sessionId: current, currentPassword: PASSWORD, newPassword: PASSWORD }),
    ).toEqual({ ok: false, reason: "same_password" });

    expect(
      await service.changePassword({ userId: user.id, sessionId: current, currentPassword: PASSWORD, newPassword: "Qwerty12345" }),
    ).toEqual({ ok: false, reason: "common_password" });

    const done = await service.changePassword({
      userId: user.id,
      sessionId: current,
      currentPassword: PASSWORD,
      newPassword: "Yeni123456",
    });
    expect(done).toEqual({ ok: true, role: "instructor" });

    const [after] = await db.select().from(users).where(eq(users.id, user.id));
    expect(after!.mustChangePassword).toBe(false);
    const left = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id));
    expect(left.map((s) => s.id)).toEqual([current]);
    expect(left.map((s) => s.id)).not.toContain(other);
  });

  it("diğer oturumlardan çıkış yalnız diğerlerini kapatır ve sayar", async () => {
    const { user } = await createStaff();
    const current = await addSession(user.id);
    await addSession(user.id);
    await addSession(user.id);

    expect(await service.countOtherSessions(user.id, current)).toBe(2);
    expect(await service.signOutOtherSessions(user.id, current)).toBe(2);
    expect(await service.countOtherSessions(user.id, current)).toBe(0);
  });

  it("Google bağlama: başka kullanıcıya bağlı sub çakışır, kendi sub'ı idempotenttir, kaldırılabilir", async () => {
    const a = await createStaff();
    const b = await createStaff();
    const sub = `google-sub-${rnd()}`;

    expect(await service.linkGoogleAccount({ userId: a.user.id, sub, email: "a@gmail.com" })).toBe("linked");
    expect(await service.linkGoogleAccount({ userId: b.user.id, sub, email: "b@gmail.com" })).toBe("taken");
    expect(await service.linkGoogleAccount({ userId: a.user.id, sub, email: "a@gmail.com" })).toBe("linked");

    expect(await service.findUserByGoogleSub(sub)).toMatchObject({ userId: a.user.id, status: "active" });
    expect(await service.getGoogleLink(a.user.id)).toEqual({ email: "a@gmail.com" });
    expect(await service.getGoogleLink(b.user.id)).toBeNull();
    const rows = await db.select().from(oauthAccounts).where(eq(oauthAccounts.providerUserId, sub));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.providerEmailEnc).not.toContain("gmail");

    expect(await service.unlinkGoogleAccount(a.user.id)).toBe(true);
    expect(await service.unlinkGoogleAccount(a.user.id)).toBe(false);
    expect(await service.findUserByGoogleSub(sub)).toBeNull();
  });
});
