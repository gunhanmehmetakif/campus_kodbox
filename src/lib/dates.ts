/**
 * Tarih/saat biçimleme — TEK KAYNAK (DESIGN.md: her yerde tr-TR, Europe/Istanbul).
 *
 * - DB'de her şey UTC (timestamptz). Gösterimde HER ZAMAN bu modül kullanılır;
 *   `toLocaleString()` / `date-fns format()` doğrudan çağrılmaz (sunucu saat dilimi UTC'dir,
 *   kullanıcınınki farklı olabilir → yanlış saat + hydration hatası).
 * - Saf fonksiyonlar; sunucu ve istemcide aynı çıktıyı verir.
 */

export const TIME_ZONE = "Europe/Istanbul";
export const LOCALE = "tr-TR";

export type DateInput = Date | string | number;

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** Bir anın İstanbul'daki takvim/saat bileşenleri. (month 1–12) */
export function getZonedParts(value: DateInput): ZonedParts {
  const parts = partsFormatter.formatToParts(toDate(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * İstanbul duvar saatini (yıl, ay, gün, saat, dakika) UTC `Date`'e çevirir.
 * Türkiye 2016'dan beri sabit UTC+3 olsa da, genel çözüm için ofset Intl ile hesaplanır.
 */
export function zonedTimeToUtc(parts: Omit<ZonedParts, "second"> & { second?: number }): Date {
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second ?? 0);
  // İlk tahmin: ofseti bul, düzelt; DST geçişleri için bir kez daha doğrula.
  let guess = asUtc - offsetMs(new Date(asUtc));
  const corrected = asUtc - offsetMs(new Date(guess));
  if (corrected !== guess) guess = corrected;
  return new Date(guess);
}

/** O andaki İstanbul ofseti (ms). */
function offsetMs(date: Date): number {
  const p = getZonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_LONG = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const WEEKDAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const WEEKDAYS_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Haftanın günü (0 = Pazar), İstanbul'a göre. */
function zonedWeekday(value: DateInput): number {
  const p = getZonedParts(value);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** "12 Eki 2026, 23:59" — varsayılan tarih+saat biçimi. */
export function formatDateTime(value: DateInput): string {
  const p = getZonedParts(value);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}, ${pad(p.hour)}:${pad(p.minute)}`;
}

/** "12 Eki 2026" */
export function formatDate(value: DateInput): string {
  const p = getZonedParts(value);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

/** "12 Ekim 2026 Pazartesi" — uzun biçim (başlıklar, ekran okuyucu). */
export function formatDateLong(value: DateInput): string {
  const p = getZonedParts(value);
  return `${p.day} ${MONTHS_LONG[p.month - 1]} ${p.year} ${WEEKDAYS_LONG[zonedWeekday(value)]}`;
}

/** "23:59" */
export function formatTime(value: DateInput): string {
  const p = getZonedParts(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Kısa biçim; yıl, `reference` ile aynıysa yazılmaz.
 * "12 Eki 23:59" · farklı yılda "12 Eki 2027, 23:59"
 */
export function formatDateTimeShort(value: DateInput, reference: DateInput): string {
  const p = getZonedParts(value);
  const sameYear = getZonedParts(reference).year === p.year;
  const datePart = `${p.day} ${MONTHS_SHORT[p.month - 1]}${sameYear ? "" : ` ${p.year}`}`;
  return `${datePart}${sameYear ? " " : ", "}${pad(p.hour)}:${pad(p.minute)}`;
}

/** "Pzt 12 Eki" */
export function formatDayShort(value: DateInput): string {
  const p = getZonedParts(value);
  return `${WEEKDAYS_SHORT[zonedWeekday(value)]} ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** ISO 8601 (UTC) — <time dateTime> için. */
export function toIso(value: DateInput): string {
  return toDate(value).toISOString();
}

/* ─────────────────────────────── Göreli zaman ─────────────────────────────── */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/**
 * "az önce", "5 dakika önce", "2 saat sonra", "dün", "yarın", "3 gün önce".
 * 30 günden uzaksa mutlak tarih ("12 Eki 2026") döner.
 */
export function formatRelative(value: DateInput, now: DateInput = Date.now()): string {
  const diff = toDate(value).getTime() - toDate(now).getTime();
  const abs = Math.abs(diff);
  if (abs < 45_000) return diff <= 0 ? "az önce" : "birazdan";
  if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
  if (abs < 30 * DAY) {
    // Takvim günü farkı (İstanbul'a göre): "dün"/"yarın" doğru çıksın.
    const a = getZonedParts(value);
    const b = getZonedParts(now);
    const days = Math.round(
      (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / DAY,
    );
    return rtf.format(days, "day");
  }
  return formatDate(value);
}

/* ─────────────────────────────── Kalan süre ─────────────────────────────── */

export type DurationParts = { days: number; hours: number; minutes: number; seconds: number };

export function splitDuration(ms: number): DurationParts {
  const total = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/**
 * Sayaç biçimi (mono, DESIGN.md): "2g 04s 13dk" · son 1 saatte "13dk 05sn" · 1 dk altında "45sn".
 * Mutlak değer alınır; "kaldı"/"gecikti" eki çağıranın işidir.
 */
export function formatCountdown(ms: number): string {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days > 0) return `${days}g ${pad(hours)}s ${pad(minutes)}dk`;
  if (hours > 0) return `${hours}s ${pad(minutes)}dk`;
  if (minutes > 0) return `${minutes}dk ${pad(seconds)}sn`;
  return `${seconds}sn`;
}

/**
 * Ekran okuyucu için uzun biçim: "2 gün 4 saat", "13 dakika", "45 saniye".
 * En büyük iki birim kullanılır.
 */
export function formatDurationLong(ms: number): string {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const units: string[] = [];
  if (days) units.push(`${days} gün`);
  if (hours) units.push(`${hours} saat`);
  if (minutes && units.length < 2) units.push(`${minutes} dakika`);
  if (units.length === 0) units.push(`${seconds} saniye`);
  return units.slice(0, 2).join(" ");
}

/* ─────────────────────────── Form alanı dönüşümleri ─────────────────────────── */

/** `<input type="datetime-local">` değeri ("2026-10-12T23:59"), İstanbul saatine göre. */
export function toDateTimeLocalValue(value: DateInput | null | undefined): string {
  if (value == null) return "";
  const p = getZonedParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * "2026-10-12T23:59" (İstanbul duvar saati) → UTC Date. Geçersizse null.
 * Sunucu tarafında form verisini çözerken kullanın.
 */
export function parseDateTimeLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number) as [number, number, number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const date = zonedTimeToUtc({ year: y, month: mo, day: d, hour: h, minute: mi, second: Number.isNaN(s) ? 0 : s });
  // 31 Şubat gibi taşmaları reddet.
  const back = getZonedParts(date);
  if (back.year !== y || back.month !== mo || back.day !== d) return null;
  return date;
}

/** İstanbul'da o günün başlangıcı (00:00) — UTC Date. */
export function startOfZonedDay(value: DateInput): Date {
  const p = getZonedParts(value);
  return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0 });
}

export const TIME = { MINUTE, HOUR, DAY } as const;
