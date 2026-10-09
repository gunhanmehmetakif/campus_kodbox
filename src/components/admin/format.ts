const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});
const dateOnly = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

export function formatDateTime(value: Date | null | undefined, fallback = "—"): string {
  return value ? dateTime.format(value) : fallback;
}

/** Formats a `YYYY-MM-DD` string (no time zone shifting). */
export function formatDay(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return fallback;
  return dateOnly.format(new Date(Date.UTC(y, m - 1, d, 12)));
}
