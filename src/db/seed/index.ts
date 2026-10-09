/**
 * npm run db:seed: base data. MKU school, active term, first admin (SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD). Idempotent: existing rows are never modified (the admin password is
 * NOT reset). The admin must change the password on first login (must_change_password).
 */
import "../../../scripts/load-env";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, terms, users, type School, type Term } from "@/db/schema";
import { env } from "@/lib/env";
import { emailDomain, normalizeDomain } from "@/lib/identity";
import { passwordSchema } from "@/lib/password-policy";
import { audit } from "@/lib/server/audit";
import { blindIndex, encrypt } from "@/lib/server/crypto";
import { hashPassword } from "@/lib/server/password";

export const MKU = {
  slug: "mku",
  name: "Mustafa Kemal Üniversitesi",
  studentEmailDomain: "ogr.mku.edu.tr",
  staffEmailDomain: "mku.edu.tr",
  studentNoRegex: "^\\d{6,12}$",
} as const;

export const ACTIVE_TERM = { name: "2026-2027 Güz", startsOn: "2026-09-21", endsOn: "2027-01-22" } as const;

async function ensureSchool(): Promise<School> {
  await db.insert(schools).values(MKU).onConflictDoNothing({ target: schools.slug });
  const [school] = await db.select().from(schools).where(eq(schools.slug, MKU.slug)).limit(1);
  if (!school) throw new Error("Could not create the school.");
  return school;
}

async function ensureActiveTerm(schoolId: string): Promise<Term> {
  await db
    .insert(terms)
    .values({ schoolId, ...ACTIVE_TERM, isActive: false })
    .onConflictDoNothing({ target: [terms.schoolId, terms.name] });

  const [active] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.isActive, true)))
    .limit(1);
  if (active) return active;

  const [term] = await db
    .update(terms)
    .set({ isActive: true })
    .where(and(eq(terms.schoolId, schoolId), eq(terms.name, ACTIVE_TERM.name)))
    .returning();
  if (!term) throw new Error("Could not activate the term.");
  return term;
}

async function ensureAdmin(school: School): Promise<{ created: boolean; email: string }> {
  const email = (env.SEED_ADMIN_EMAIL ?? "").toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD ?? "";

  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set (.env).");
  if (emailDomain(email) !== normalizeDomain(school.staffEmailDomain)) {
    throw new Error(`SEED_ADMIN_EMAIL must be on the staff domain: @${school.staffEmailDomain}`);
  }

  const emailHash = blindIndex(email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.emailHash, emailHash)).limit(1);
  if (existing) return { created: false, email };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    throw new Error(`SEED_ADMIN_PASSWORD is invalid: ${parsed.error.issues.map((i) => i.message).join(" ")}`);
  }

  const now = new Date();
  const [admin] = await db
    .insert(users)
    .values({
      role: "admin",
      schoolId: school.id,
      emailEnc: encrypt(email),
      emailHash,
      displayName: "Sistem Yöneticisi",
      passwordHash: await hashPassword(password),
      status: "active",
      mustChangePassword: true,
      emailVerifiedAt: now,
      passwordChangedAt: now,
    })
    .returning({ id: users.id });

  await audit(null, "seed.run", { type: "user", id: admin!.id }, { step: "admin.create" });
  return { created: true, email };
}

async function main() {
  const school = await ensureSchool();
  const term = await ensureActiveTerm(school.id);
  const admin = await ensureAdmin(school);
  console.info(
    [
      "",
      "Seed complete",
      `  School: ${school.name} (student @${school.studentEmailDomain}, staff @${school.staffEmailDomain})`,
      `  Term  : ${term.name} (active)`,
      `  Admin : ${admin.email} ${admin.created ? "(created, must change password on first login)" : "(already existed, unchanged)"}`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end({ timeout: 5 }));
