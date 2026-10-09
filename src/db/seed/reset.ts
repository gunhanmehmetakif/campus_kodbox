/**
 * npm run db:reset — YEREL veritabanını tamamen siler (şema + veri), sonra migrate + seed çalışır.
 * Güvenlik: sadece NODE_ENV≠production ve localhost/127.0.0.1 veritabanında çalışır.
 */
import "../../../scripts/load-env";

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`db:reset sadece yerel veritabanında çalışır (host: ${host}).`);
  }
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
    console.info(`✓ ${host} üzerindeki veritabanı sıfırlandı.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("✗ Sıfırlama başarısız:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
