import "./scripts/load-env";

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tanımlı değil. .env.example dosyasını .env.local olarak kopyalayın.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
  migrations: { table: "__drizzle_migrations", schema: "public" },
});
