/**
 * Assignment rules (docs/fazlar/F4-odev-teslim.md section 1). Pure module: no server-only
 * imports, safe for client components.
 */

export type AssignmentTiming = {
  submissionType: "link" | "none";
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
};

export type SubmissionWindow =
  | { state: "no_submission" }
  | { state: "open"; closesAt: Date | null }
  | { state: "late"; closesAt: Date | null }
  | { state: "closed" };

export type LatePenalty = { type: "none" | "points" | "percent"; value: number | null };

export function getSubmissionWindow(a: AssignmentTiming, now: Date, courseArchived: boolean): SubmissionWindow {
  if (a.submissionType === "none") return { state: "no_submission" };
  if (courseArchived) return { state: "closed" };
  if (!a.dueAt) return { state: "open", closesAt: null };
  if (now.getTime() <= a.dueAt.getTime()) return { state: "open", closesAt: a.dueAt };
  if (!a.lateAllowed) return { state: "closed" };
  if (a.lateUntil && now.getTime() > a.lateUntil.getTime()) return { state: "closed" };
  return { state: "late", closesAt: a.lateUntil };
}

export function isLateAt(a: AssignmentTiming, at: Date): boolean {
  return a.dueAt !== null && at.getTime() > a.dueAt.getTime();
}

export function suggestScore(raw: number, penalty: LatePenalty, isLate: boolean): number {
  let result = raw;
  if (isLate && penalty.value !== null) {
    if (penalty.type === "points") result = Math.max(0, raw - penalty.value);
    else if (penalty.type === "percent") result = raw * (1 - penalty.value / 100);
  }
  return Math.round((result + Number.EPSILON) * 100) / 100;
}

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

export function isAllowedSubmissionHost(url: string, allowAnyLink: boolean): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (allowAnyLink) return true;
  return DRIVE_HOSTS.has(parsed.hostname.toLowerCase());
}

/* ───────────────────────── Istanbul time (fixed UTC+3) ───────────────────────── */

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "YYYY-MM-DDTHH:mm" (Istanbul wall clock) to the UTC instant. Throws on invalid input. */
export function parseIstanbulLocal(s: string): Date {
  const m = LOCAL_INPUT.exec(s.trim());
  if (!m) throw new Error("Invalid local date-time");
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number) as [number, number, number, number, number];
  const ms = Date.UTC(y, mo - 1, d, h, mi) - ISTANBUL_OFFSET_MS;
  const back = new Date(ms + ISTANBUL_OFFSET_MS);
  if (
    Number.isNaN(ms) ||
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== mo - 1 ||
    back.getUTCDate() !== d ||
    back.getUTCHours() !== h ||
    back.getUTCMinutes() !== mi
  ) {
    throw new Error("Invalid local date-time");
  }
  return new Date(ms);
}

/** UTC instant to "YYYY-MM-DDTHH:mm" in Istanbul wall clock (for datetime-local inputs). */
export function toIstanbulLocalInput(d: Date): string {
  return new Date(d.getTime() + ISTANBUL_OFFSET_MS).toISOString().slice(0, 16);
}
