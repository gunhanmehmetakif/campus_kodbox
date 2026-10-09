import "server-only";

import { asc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { schools, type School } from "@/db/schema";
import type { SchoolIdentity } from "@/lib/identity";

/**
 * School access. There is one school (MKU) for now; schools are always resolved by id or
 * domain, never hard coded, so multi-school support stays open.
 */

/** First (default) school. Login and register forms use it while there is a single school. */
export const getDefaultSchool = cache(async (): Promise<School | null> => {
  const [row] = await db.select().from(schools).orderBy(asc(schools.createdAt)).limit(1);
  return row ?? null;
});

export const getSchoolById = cache(async (id: string): Promise<School | null> => {
  const [row] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  return row ?? null;
});

export async function listSchools(): Promise<School[]> {
  return db.select().from(schools).orderBy(asc(schools.name));
}

/** Resolves school and login kind (student/staff) from an email domain. */
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

/** Identity fields that are safe to pass to the client. */
export function toSchoolIdentity(
  school: Pick<School, "studentEmailDomain" | "staffEmailDomain" | "studentNoRegex">,
): SchoolIdentity {
  return {
    studentEmailDomain: school.studentEmailDomain,
    staffEmailDomain: school.staffEmailDomain,
    studentNoRegex: school.studentNoRegex,
  };
}
