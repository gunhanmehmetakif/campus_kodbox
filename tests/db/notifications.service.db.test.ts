/**
 * Notification service, reminders and cleanup: real database integration test
 * (docs/fazlar/F5-F6-ogrenci-bildirim.md 3.5). Skipped when the database is unreachable.
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

describe.skipIf(!available)("notifications service (DB)", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const { notify } = await import("@/lib/server/notifications");
  const service = await import("@/server/notifications/service");
  const reminders = await import("@/server/notifications/reminders");
  const { users, terms, courses, courseRoster, assignments, submissions, notifications, pushSubscriptions, sessions, schools } =
    schema;

  const createdUserIds: string[] = [];
  const createdTermIds: string[] = [];
  const rnd = () => crypto.randomUUID();
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

  async function createUser(role: "student" | "instructor", status: "active" | "disabled" = "active") {
    const tag = rnd().slice(0, 8);
    const domain = role === "student" ? school.studentEmailDomain : school.staffEmailDomain;
    const email = `${tag}@${domain}`;
    const no = String(Math.floor(100_000_000 + Math.random() * 899_999_999));
    const [row] = await db
      .insert(users)
      .values({
        role,
        schoolId: school.id,
        emailEnc: encrypt(email),
        emailHash: blindIndex(email),
        ...(role === "student" ? { studentNoEnc: encrypt(no), studentNoHash: blindIndex(no) } : {}),
        passwordHash: "x",
        status,
        displayName: role === "instructor" ? "Test Eğitmen" : null,
      })
      .returning();
    createdUserIds.push(row!.id);
    return row!.id;
  }

  async function createCourse(archived = false) {
    const instructorId = await createUser("instructor");
    const [term] = await db.insert(terms).values({ schoolId: school.id, name: `T-${rnd()}` }).returning();
    createdTermIds.push(term!.id);
    const [course] = await db
      .insert(courses)
      .values({
        instructorId,
        termId: term!.id,
        code: `T${rnd().slice(0, 5).toUpperCase()}`,
        name: "Test Dersi",
        archivedAt: archived ? new Date() : null,
      })
      .returning();
    return course!;
  }

  async function enroll(courseId: string, userId: string | null) {
    const no = rnd();
    await db.insert(courseRoster).values({
      courseId,
      studentNoHash: blindIndex(no),
      studentNoEnc: encrypt(no),
      userId,
    });
  }

  async function createAssignment(
    courseId: string,
    over: Partial<typeof assignments.$inferInsert> = {},
  ): Promise<string> {
    const [row] = await db
      .insert(assignments)
      .values({
        courseId,
        title: "Ödev",
        status: "published",
        publishedAt: new Date(),
        submissionType: "link",
        dueAt: new Date(Date.now() + 10 * 3600_000),
        ...over,
      })
      .returning({ id: assignments.id });
    return row!.id;
  }

  const dueSoonOf = (userId: string) =>
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, "assignment.due_soon")));

  describe("runDueReminders", () => {
    it("notifies only active enrolled students without a submission, once", async () => {
      const course = await createCourse();
      const pending = await createUser("student");
      const submitted = await createUser("student");
      const disabled = await createUser("student", "disabled");
      const outsider = await createUser("student");
      await enroll(course.id, pending);
      await enroll(course.id, submitted);
      await enroll(course.id, disabled);
      await enroll(course.id, null); // not registered yet
      const assignmentId = await createAssignment(course.id);
      await db.insert(submissions).values({ assignmentId, studentId: submitted, url: "https://drive.google.com/x" });

      const now = new Date();
      const first = await reminders.runDueReminders(now);
      expect(first.assignments).toBeGreaterThanOrEqual(1);
      expect(await dueSoonOf(pending)).toHaveLength(1);
      expect(await dueSoonOf(submitted)).toHaveLength(0);
      expect(await dueSoonOf(disabled)).toHaveLength(0);
      expect(await dueSoonOf(outsider)).toHaveLength(0);
      const [sent] = await dueSoonOf(pending);
      expect(sent!.payload).toMatchObject({ assignmentId, courseId: course.id, title: "Ödev" });

      await reminders.runDueReminders(now);
      expect(await dueSoonOf(pending)).toHaveLength(1);

      // changing the deadline clears the marker (done by saveAssignment); simulate and rerun
      await db.update(assignments).set({ dueReminderSentAt: null }).where(eq(assignments.id, assignmentId));
      await reminders.runDueReminders(now);
      expect(await dueSoonOf(pending)).toHaveLength(2);
    });

    it("skips archived courses, drafts, none-type, no deadline, out of window and past deadlines", async () => {
      const live = await createCourse();
      const archived = await createCourse(true);
      const student = await createUser("student");
      await enroll(live.id, student);
      await enroll(archived.id, student);

      const ids = [
        await createAssignment(archived.id),
        await createAssignment(live.id, { status: "draft", publishedAt: null }),
        await createAssignment(live.id, { submissionType: "none" }),
        await createAssignment(live.id, { dueAt: null }),
        await createAssignment(live.id, { dueAt: new Date(Date.now() + 48 * 3600_000) }),
        await createAssignment(live.id, { dueAt: new Date(Date.now() - 3600_000) }),
      ];
      await reminders.runDueReminders(new Date());
      expect(await dueSoonOf(student)).toHaveLength(0);
      const rows = await db.select().from(assignments).where(inArray(assignments.id, ids));
      expect(rows.every((r) => r.dueReminderSentAt === null)).toBe(true);
    });
  });

  describe("runCleanup", () => {
    it("deletes expired sessions and read notifications older than 90 days only", async () => {
      const userId = await createUser("student");
      const now = new Date();
      const day = 86_400_000;
      await db.insert(sessions).values([
        { id: `expired-${rnd()}`, userId, expiresAt: new Date(now.getTime() - 1000) },
        { id: `valid-${rnd()}`, userId, expiresAt: new Date(now.getTime() + day) },
      ]);
      await db.insert(notifications).values([
        { userId, type: "x.old-read", readAt: new Date(now.getTime() - 91 * day) },
        { userId, type: "x.recent-read", readAt: new Date(now.getTime() - 10 * day) },
        { userId, type: "x.old-unread" },
      ]);

      const result = await reminders.runCleanup(now);
      expect(result.sessions).toBeGreaterThanOrEqual(1);
      expect(result.notifications).toBeGreaterThanOrEqual(1);

      const left = await db.select().from(notifications).where(eq(notifications.userId, userId));
      expect(left.map((n) => n.type).sort()).toEqual(["x.old-unread", "x.recent-read"]);
      const keptSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));
      expect(keptSessions).toHaveLength(1);
      expect(keptSessions[0]!.id.startsWith("valid-")).toBe(true);
    });
  });

  describe("notifications", () => {
    it("lists newest first with a read flag; opening marks read and returns the target", async () => {
      const userId = await createUser("student");
      await notify([userId], "submission.score_published", {
        courseId: "c1",
        courseCode: "BİL101",
        assignmentId: "a1",
        title: "Ödev 1",
      });
      const page = await service.listNotificationPage(userId, 1);
      expect(page.total).toBe(1);
      expect(page.items[0]).toMatchObject({ read: false, href: "/ogrenci/odevler/a1", icon: "score" });

      const href = await service.openNotification(userId, page.items[0]!.id);
      expect(href).toBe("/ogrenci/odevler/a1");
      expect((await service.listNotificationPage(userId)).items[0]!.read).toBe(true);
    });

    it("cannot open or read someone else's notification", async () => {
      const owner = await createUser("student");
      const other = await createUser("student");
      await notify([owner], "course.enrolled", { courseId: "c1", courseCode: "X1", courseName: "Ders" });
      const [row] = await db.select().from(notifications).where(eq(notifications.userId, owner));

      expect(await service.openNotification(other, row!.id)).toBeNull();
      const [after] = await db.select().from(notifications).where(eq(notifications.id, row!.id));
      expect(after!.readAt).toBeNull();

      expect(await service.markAllRead(other)).toBe(0);
      expect(await service.markAllRead(owner)).toBe(1);
    });
  });

  describe("push subscriptions", () => {
    const keys = { p256dh: "p256", auth: "auth" };

    it("upsert moves an endpoint to another user and updates keys", async () => {
      const a = await createUser("student");
      const b = await createUser("student");
      const endpoint = `https://push.example.com/${rnd()}`;
      await service.savePushSubscription(a, { endpoint, keys }, "UA-1");
      await service.savePushSubscription(b, { endpoint, keys: { p256dh: "new", auth: "new2" } }, "UA-2");

      const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: b, p256dh: "new", auth: "new2", userAgent: "UA-2" });
    });

    it("keeps at most 10 subscriptions per user, dropping the oldest", async () => {
      const userId = await createUser("student");
      const endpoints: string[] = [];
      for (let i = 0; i < 12; i++) {
        const endpoint = `https://push.example.com/${rnd()}`;
        endpoints.push(endpoint);
        await service.savePushSubscription(userId, { endpoint, keys }, null);
        await db
          .update(pushSubscriptions)
          .set({ createdAt: new Date(Date.now() - (12 - i) * 60_000) })
          .where(eq(pushSubscriptions.endpoint, endpoint));
      }
      const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      expect(rows).toHaveLength(10);
      expect(rows.map((r) => r.endpoint)).not.toContain(endpoints[0]);
      expect(rows.map((r) => r.endpoint)).toContain(endpoints[11]);
    });

    it("deletes only the caller's own subscription", async () => {
      const owner = await createUser("student");
      const other = await createUser("student");
      const endpoint = `https://push.example.com/${rnd()}`;
      await service.savePushSubscription(owner, { endpoint, keys }, null);

      await service.deletePushSubscription(other, endpoint);
      expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))).toHaveLength(1);
      await service.deletePushSubscription(owner, endpoint);
      expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))).toHaveLength(0);
    });
  });
});
