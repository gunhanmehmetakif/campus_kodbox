import { formatDistanceToNowStrict } from "date-fns";
import { tr } from "date-fns/locale";

const shortDateTime = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const longDate = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dueShort = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "25 Eki Paz 23:59" in Europe/Istanbul. */
export function formatDueShort(date: Date): string {
  return dueShort.format(date);
}

/** "14 Eki 21:03" in Europe/Istanbul. */
export function formatShortDateTime(date: Date): string {
  return shortDateTime.format(date);
}

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** "3 saat önce". Call only from components rendered after dynamic data (uses the current time). */
export function formatAgo(date: Date): string {
  return formatDistanceToNowStrict(date, { locale: tr, addSuffix: true });
}

export function studentCourseHref(courseId: string, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : "";
  return `/ogrenci/dersler/${courseId}${query ? `?${query}` : ""}`;
}

/** Deep link to an assignment inside its course feed (opens the submission dialog when possible). */
export function studentAssignmentHref(assignmentId: string, courseId: string): string {
  return `/ogrenci/dersler/${courseId}?odev=${assignmentId}`;
}
