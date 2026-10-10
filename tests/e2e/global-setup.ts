import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { E2E_DATABASE_URL, ROOT, serverEnv } from "./support/env";
import { AUTH_DIR, randomPassword, saveState } from "./support/state";

const ADMIN_LOCAL = "e2e.admin";
const ADMIN_EMAIL = `${ADMIN_LOCAL}@mku.edu.tr`;

/** Refuses anything but a local database whose name ends in `_e2e`: the schema is dropped on every run. */
function parseTarget(): { name: string; adminUrl: string } {
  const url = new URL(E2E_DATABASE_URL);
  const name = url.pathname.replace(/^\//, "");
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error(`E2E_DATABASE_URL must point at a local database, got host "${url.hostname}".`);
  }
  if (!/^[a-z0-9_]+_e2e$/.test(name)) {
    throw new Error(`E2E database name must end in "_e2e" (got "${name}"); refusing to reset it.`);
  }
  url.pathname = "/postgres";
  return { name, adminUrl: url.toString() };
}

async function ensureDatabase(name: string, adminUrl: string) {
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    const rows = await admin`select 1 from pg_database where datname = ${name}`;
    if (rows.length === 0) await admin.unsafe(`create database "${name}"`);
  } finally {
    await admin.end({ timeout: 5 });
  }
}

async function resetAndMigrate() {
  const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("drop schema public cascade; create schema public; drop schema if exists drizzle cascade;");
    await migrate(drizzle(sql), { migrationsFolder: path.join(ROOT, "drizzle") });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Seeds the school, the active term and the admin through the project's own seed script. */
function seed(adminPassword: string) {
  const tsx = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  try {
    execFileSync(process.execPath, [tsx, "--conditions=react-server", "src/db/seed/index.ts"], {
      cwd: ROOT,
      env: {
        ...process.env,
        ...serverEnv(),
        SEED_ADMIN_EMAIL: ADMIN_EMAIL,
        SEED_ADMIN_PASSWORD: adminPassword,
      },
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const out = error as { stdout?: string; stderr?: string };
    throw new Error(`Seed failed:\n${out.stdout ?? ""}\n${out.stderr ?? ""}`);
  }
}

/** The first-login password change is covered by the instructor flow; the admin starts ready. */
async function markAdminReady() {
  const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql`update users set must_change_password = false where role = 'admin'`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export default async function globalSetup() {
  const { name, adminUrl } = parseTarget();
  await ensureDatabase(name, adminUrl);
  await resetAndMigrate();

  const adminPassword = randomPassword();
  seed(adminPassword);
  await markAdminReady();

  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  saveState({ admin: { local: ADMIN_LOCAL, email: ADMIN_EMAIL, password: adminPassword } });
}
