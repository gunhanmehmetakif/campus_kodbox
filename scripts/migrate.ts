/**
 * Production migration runner. Bundled to `scripts/migrate.mjs` by the Dockerfile and run
 * before the server starts. Reads DATABASE_URL straight from process.env (no app env
 * validation, no drizzle-kit). Any failure exits non-zero so the container does not start.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sql = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    // Same table as drizzle.config.ts (public.__drizzle_migrations), so drizzle-kit and this runner agree.
    await migrate(drizzle(sql), {
      migrationsFolder: "./drizzle",
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "public",
    });
    console.info("[migrate] migrations applied.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
