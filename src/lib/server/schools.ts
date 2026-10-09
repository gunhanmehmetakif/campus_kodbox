import "server-only";

import { asc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { schools, type School } from "@/db/schema";
import type { SchoolIdentity } from "@/lib/identity";

/**
 * Okul erişimi. Şimdilik tek okul (MKÜ) var; çok okullu yapıya hazır olmak için okul her zaman
 * id ile veya domain'den çözülür, sabit kodlanmaz.
 */

/** İlk (varsayılan) okul. Tek okullu dönemde giriş/kayıt formları bunu kullanır. */
export const getDefaultSchool = cache(async (): Promise<School | null> => {
  const [row] = await db.select().from(schools).orderBy(asc(schools.createdAt)).limit(1);
  return row ?? null;
});

export const getSchoolById = cache(async (id: string): Promise<School | null> => {
  const [row] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  return row ?? null;
});

/** Tüm okullar (kayıt ekranındaki okul seçimi için). */
export async function listSchools(): Promise<School[]> {
  return db.select().from(schools).orderBy(asc(schools.name));
}

/** E-posta domain'inden okul + giriş türü (öğrenci/personel). */
export async function findSchoolByEmailDomain(
  domain: string,
): Promise<{ school: School; kind: "student" | "staff" } | null> {
  const d = domain.trim().toLowerCase();
  const all = await db.select().from(schools);
  for (const school of all) {
    if (school.studentEmailDomain === d) return { school, kind: "student" };
    if (school.staffEmailDomain === d) return { school, kind: "staff" };
  }
  return null;
}

/** İstemciye geçirilebilecek kimlik alanları (gizli bilgi yok). */
export function toSchoolIdentity(school: Pick<School, "studentEmailDomain" | "staffEmailDomain" | "studentNoRegex">): SchoolIdentity {
  return {
    studentEmailDomain: school.studentEmailDomain,
    staffEmailDomain: school.staffEmailDomain,
    studentNoRegex: school.studentNoRegex,
  };
}
