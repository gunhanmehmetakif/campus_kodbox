/**
 * School email <-> local part conversions (pure; client + server).
 *
 * Everyone signs in with a school email:
 *   student -> `${studentNo}@${school.studentEmailDomain}`  (e.g. 260000009@ogr.mku.edu.tr)
 *   staff   -> `${localPart}@${school.staffEmailDomain}`    (e.g. ahmet.yilmaz@mku.edu.tr)
 * Forms only ask for the local part; the domain is a fixed suffix.
 */

export type LoginKind = "student" | "staff";

/** School fields needed for identity handling (subset of the `schools` row). */
export type SchoolIdentity = {
  studentEmailDomain: string;
  staffEmailDomain: string;
  studentNoRegex: string;
};

/** Turkish "İ".toLowerCase() leaves a combining dot above (U+0307); strip it. */
const COMBINING_DOT_ABOVE = /̇/g;

/** @example normalizeDomain(" @OGR.MKU.edu.tr ") // "ogr.mku.edu.tr" */
export function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^@+/, "").toLowerCase().replace(COMBINING_DOT_ABOVE, "");
}

/** @example normalizeLocalPart("  Ahmet.Yilmaz@mku.edu.tr ") // "ahmet.yilmaz" */
export function normalizeLocalPart(input: string): string {
  const withoutDomain = input.normalize("NFKC").split("@")[0] ?? "";
  return withoutDomain.replace(/\s+/g, "").toLowerCase().replace(COMBINING_DOT_ABOVE, "");
}

export function splitEmail(input: string): { local: string; domain: string | null } {
  const trimmed = input.normalize("NFKC").trim();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return { local: normalizeLocalPart(trimmed), domain: null };
  return { local: normalizeLocalPart(trimmed.slice(0, at)), domain: normalizeDomain(trimmed.slice(at + 1)) };
}

export function detectKindFromDomain(domain: string, school: SchoolIdentity): LoginKind | null {
  const d = normalizeDomain(domain);
  if (d === normalizeDomain(school.studentEmailDomain)) return "student";
  if (d === normalizeDomain(school.staffEmailDomain)) return "staff";
  return null;
}

/**
 * Interprets what the user typed or pasted into the login box.
 * `detectedKind` is set when a full school email was pasted; `foreignDomain` when the pasted
 * domain does not belong to the school.
 */
export function parseLoginInput(
  raw: string,
  school: SchoolIdentity,
): { local: string; detectedKind: LoginKind | null; foreignDomain: string | null } {
  const { local, domain } = splitEmail(raw);
  if (!domain) return { local, detectedKind: null, foreignDomain: null };
  const kind = detectKindFromDomain(domain, school);
  return { local, detectedKind: kind, foreignDomain: kind ? null : domain };
}

export function domainForKind(kind: LoginKind, school: SchoolIdentity): string {
  return normalizeDomain(kind === "student" ? school.studentEmailDomain : school.staffEmailDomain);
}

export function buildEmail(localPart: string, domain: string): string {
  return `${normalizeLocalPart(localPart)}@${normalizeDomain(domain)}`;
}

export function studentEmail(studentNo: string, school: Pick<SchoolIdentity, "studentEmailDomain">): string {
  return buildEmail(normalizeStudentNo(studentNo), school.studentEmailDomain);
}

export function staffEmail(localPart: string, school: Pick<SchoolIdentity, "staffEmailDomain">): string {
  return buildEmail(localPart, school.staffEmailDomain);
}

/** Strips whitespace and any email suffix; NFKC turns full-width digits into ASCII. */
export function normalizeStudentNo(input: string): string {
  return input.normalize("NFKC").replace(/\s+/g, "").split("@")[0] ?? "";
}

/** Validates against the school's regex. A broken regex (admin error) counts as invalid. */
export function isValidStudentNo(studentNo: string, school: Pick<SchoolIdentity, "studentNoRegex">): boolean {
  try {
    return new RegExp(school.studentNoRegex).test(normalizeStudentNo(studentNo));
  } catch {
    return false;
  }
}

/** Practical subset of RFC local parts: alnum edges, `._+-` inside, no `..`, max 64 chars. */
export function isValidStaffLocalPart(local: string): boolean {
  const v = normalizeLocalPart(local);
  return v.length <= 64 && /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/.test(v) && !v.includes("..");
}

export function emailDomain(email: string): string | null {
  return splitEmail(email).domain;
}
