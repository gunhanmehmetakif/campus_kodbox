/**
 * Web push delivery: web-push is mocked, no network. Database required (skipped otherwise).
 */
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

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

describe.skipIf(!available)("deliverPush (DB, mocked web-push)", async () => {
  const webpush = (await import("web-push")).default;
  const { db } = await import("@/db");
  const { users, pushSubscriptions, schools } = await import("@/db/schema");
  const { __resetEnvCacheForTests } = await import("@/lib/env");
  const { blindIndex, encrypt } = await import("@/lib/server/crypto");
  const { getDefaultSchool } = await import("@/lib/server/schools");
  const { deliverPush, getPushPublicKey } = await import("@/lib/server/push");
  const { sendPushForNotification } = await import("@/lib/server/notifications");

  const createdUserIds: string[] = [];
  let userId: string;
  const message = { title: "t", body: "b", url: "/x", tag: "tag" };
  const send = vi.mocked(webpush.sendNotification);

  function configure(on: boolean) {
    if (on) {
      process.env.VAPID_PUBLIC_KEY = "test-public";
      process.env.VAPID_PRIVATE_KEY = "test-private";
      process.env.VAPID_SUBJECT = "mailto:test@example.com";
    } else {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;
    }
    __resetEnvCacheForTests();
  }

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
    const school = (await getDefaultSchool())!;
    const email = `${crypto.randomUUID().slice(0, 8)}@${school.studentEmailDomain}`;
    const no = String(Math.floor(100_000_000 + Math.random() * 899_999_999));
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
    userId = row!.id;
    createdUserIds.push(userId);
  });

  beforeEach(async () => {
    configure(true);
    send.mockReset();
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  });

  afterAll(async () => {
    configure(false);
    if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
    await db.$client.end({ timeout: 2 });
  });

  const addSub = async (suffix: string) => {
    const endpoint = `https://fcm.googleapis.com/fcm/send/${suffix}-${crypto.randomUUID()}`;
    await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh: "k", auth: "a" });
    return endpoint;
  };

  it("success updates lastUsedAt and passes TTL and urgency", async () => {
    const endpoint = await addSub("ok");
    send.mockResolvedValue({ statusCode: 201, body: "", headers: {} });
    expect(await deliverPush([userId], message)).toEqual({ sent: 1, removed: 0 });
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    expect(row!.lastUsedAt).not.toBeNull();
    expect(send.mock.calls[0]![2]).toMatchObject({ TTL: 86400, urgency: "normal" });
    await deliverPush([userId], { ...message, urgent: true });
    expect(send.mock.calls[1]![2]).toMatchObject({ urgency: "high" });
  });

  it("410 and 404 delete the subscription; other errors keep it", async () => {
    const gone = await addSub("gone");
    const missing = await addSub("missing");
    const flaky = await addSub("flaky");
    send.mockImplementation(async (sub) => {
      const status = sub.endpoint === gone ? 410 : sub.endpoint === missing ? 404 : 500;
      throw Object.assign(new Error("push failed"), { statusCode: status });
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deliverPush([userId], message)).toEqual({ sent: 0, removed: 2 });
    const left = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    expect(left.map((r) => r.endpoint)).toEqual([flaky]);
  });

  it("never contacts a disallowed endpoint and deletes the row", async () => {
    const bad = `https://169.254.169.254/latest/${crypto.randomUUID()}`;
    await db.insert(pushSubscriptions).values({ userId, endpoint: bad, p256dh: "k", auth: "a" });
    send.mockClear();
    expect(await deliverPush([userId], message)).toEqual({ sent: 0, removed: 1 });
    expect(send).not.toHaveBeenCalled();
    const left = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, bad));
    expect(left).toHaveLength(0);
  });

  it("is a no-op when push is not configured", async () => {
    await addSub("noop");
    configure(false);
    expect(getPushPublicKey()).toBeNull();
    expect(await deliverPush([userId], message)).toEqual({ sent: 0, removed: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("sendPushForNotification never throws outside a request scope", async () => {
    await expect(
      sendPushForNotification([userId], "assignment.due_soon", {
        courseId: "c",
        courseCode: "X1",
        assignmentId: "a",
        title: "T",
        dueAt: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
