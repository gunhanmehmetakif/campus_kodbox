/**
 * Rate limit — gerçek veritabanı entegrasyon testi (TEST_DATABASE_URL, varsayılan kodbox_test).
 * Veritabanına erişilemezse test paketi atlanır.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL!;

async function canConnect(): Promise<boolean> {
  const sql = postgres(url, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

// test/setup.ts DATABASE_URL'i TEST_DATABASE_URL'e (yoksa yerel kodbox_test) yönlendirir.
const available = await canConnect();

describe.skipIf(!available)("consume (DB)", async () => {
  const { db } = await import("@/db");
  const { consume, peek, rateLimitKey, resetRateLimit } = await import("@/lib/server/rate-limit");

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle", migrationsTable: "__drizzle_migrations", migrationsSchema: "public" });
  });

  afterAll(async () => {
    await db.$client.end({ timeout: 2 });
  });

  it("limit kadar izin verir, sonra engeller; reset sayacı siler", async () => {
    const key = rateLimitKey("test", crypto.randomUUID());
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consume(key, 3, 60));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfter).toBeGreaterThan(0);

    expect((await peek(key, { limit: 3, windowSec: 60 })).limited).toBe(true);
    await resetRateLimit(key);
    expect((await peek(key, { limit: 3, windowSec: 60 })).limited).toBe(false);
  });

  it("eşzamanlı isteklerde tam olarak limit kadarına izin verir", async () => {
    const key = rateLimitKey("test-concurrent", crypto.randomUUID());
    const results = await Promise.all(Array.from({ length: 12 }, () => consume(key, { limit: 5, windowSec: 60 })));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
});
