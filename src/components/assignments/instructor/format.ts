import { toIstanbulLocalInput } from "@/server/assignments/rules";

const short = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatShort(date: Date): string {
  return short.format(date);
}

/** Score as shown in inputs: Turkish decimal comma, empty for no score. */
export function formatScore(score: number | null): string {
  return score === null ? "" : String(score).replace(".", ",");
}

/** Parses a typed score ("72,5"). `null` means empty; `undefined` means invalid. */
export function parseScore(raw: string): number | null | undefined {
  const text = raw.trim().replace(",", ".");
  if (text === "") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** Instructor assignment page; `filtre` preselects a submissions filter. */
export function assignmentHref(assignmentId: string, filtre?: string): string {
  return `/egitmen/odevler/${assignmentId}${filtre ? `?filtre=${filtre}` : ""}`;
}

/** `datetime-local` value (Istanbul) for `days` from now at 23:59. */
export function daysFromNow(days: number): string {
  return `${toIstanbulLocalInput(new Date(Date.now() + days * 86_400_000)).slice(0, 10)}T23:59`;
}
