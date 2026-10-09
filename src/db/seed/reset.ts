/**
 * npm run db:reset step 1: drops all app tables and drizzle migration state so `db:migrate`
 * can rebuild from scratch. Refuses to run unless DATABASE_URL points at localhost.
 */
import "../../../scripts/load-env";

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const { hostname } = new URL(url);
if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
  throw new Error(`Refusing to reset a non-local database (${hostname}).`);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  console.info("Database schema dropped.");
}

main()
  .catch((error) => {
    console.error("Reset failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 5 }));
