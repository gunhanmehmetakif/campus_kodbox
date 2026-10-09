import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, terms, users, type School, type Term } from "@/db/schema";
import { emailDomain, normalizeDomain } from "@/lib/identity";
import { passwordSchema } from "@/lib/password-policy";
import { audit } from "@/lib/server/audit";
import { blindIndex, encrypt } from "@/lib/server/crypto";
import { hashPassword } from "@/lib/server/password";

/**
 * Temel seed (idempotent): MKÜ okulu, aktif dönem, ilk admin.
 * Tekrar çalıştırmak güvenlidir; var olan kayıtlara dokunmaz (admin şifresi SIFIRLANMAZ).
 */

export const MKU = {
  slug: "mku",
  name: "Hatay Mustafa Kemal Üniversitesi",
  studentEmailDomain: "ogr.mku.edu.tr",
  staffEmailDomain: "mku.edu.tr",
  studentNoRegex: "^\\d{6,12}$",
} as const;

export const ACTIVE_TERM = { name: "2026-2027 Güz", startsOn: "2026-09-21", endsOn: "2027-01-22" } as const;

export async function ensureSchool(): Promise<School> {
  await db.insert(schools).values(MKU).onConflictDoNothing({ target: schools.slug });
  const [school] = await db.select().from(schools).where(eq(schools.slug, MKU.slug)).limit(1);
  if (!school) throw new Error("Okul oluşturulamadı.");
  return school;
}

export async function ensureActiveTerm(schoolId: string): Promise<Term> {
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
  if (!term) throw new Error("Aktif dönem ayarlanamadı.");
  return term;
}

export async function ensureAdmin(school: School): Promise<{ created: boolean; email: string }> {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email) throw new Error("ADMIN_EMAIL tanımlı değil (.env.local).");
  if (emailDomain(email) !== normalizeDomain(school.staffEmailDomain)) {
    throw new Error(`ADMIN_EMAIL personel domain'inde olmalı: @${school.staffEmailDomain}`);
  }

  const emailHash = blindIndex(email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.emailHash, emailHash)).limit(1);
  if (existing) return { created: false, email };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    throw new Error(`ADMIN_PASSWORD geçersiz: ${parsed.error.issues.map((i) => i.message).join(" ")}`);
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

export async function seedBase() {
  const school = await ensureSchool();
  const term = await ensureActiveTerm(school.id);
  const admin = await ensureAdmin(school);
  return { school, term, admin };
}
