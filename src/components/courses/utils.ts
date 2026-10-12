const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

/** `?sekme=akis|ogrenciler` plus an optional feed filter (`?filtre=`). */
export function courseHref(courseId: string, tab?: string, filtre?: string): string {
  const params = new URLSearchParams();
  if (tab) params.set("sekme", tab);
  if (filtre) params.set("filtre", filtre);
  const query = params.toString();
  return `/egitmen/dersler/${courseId}${query ? `?${query}` : ""}`;
}
