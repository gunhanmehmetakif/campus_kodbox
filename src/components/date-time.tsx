import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDateTimeShort,
  formatDayShort,
  formatTime,
  toIso,
  type DateInput,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Mutlak tarih/saat (sunucu ve istemcide aynı çıktı; tr-TR, Europe/Istanbul).
 * Mono + tabular rakam (DESIGN.md: tarih/saat mono).
 *
 *   <DateTime value={assignment.dueAt} />                 → 12 Eki 2026, 23:59
 *   <DateTime value={post.publishAt} format="date" />     → 12 Eki 2026
 *   <DateTime value={x} format="short" reference={now} /> → 12 Eki 23:59 (yıl, reference ile aynıysa yazılmaz)
 *
 * Not: Sunucu bileşenlerinde Date.now() çağrısı Cache Components prerender'ında hata verir;
 * "short" için `reference` (oturum okunduktan sonra hesaplanan now) geçirin. Verilmezse yıl
 * hiç yazılmaz.
 */
export type DateTimeFormat = "datetime" | "date" | "time" | "short" | "day" | "long";

const FORMATTERS: Record<DateTimeFormat, (v: DateInput, reference?: DateInput) => string> = {
  datetime: formatDateTime,
  date: formatDate,
  time: formatTime,
  short: (v, reference) => formatDateTimeShort(v, reference ?? v),
  day: formatDayShort,
  long: formatDateLong,
};

export function DateTime({
  value,
  format = "datetime",
  mono = true,
  reference,
  className,
}: {
  value: DateInput;
  reference?: DateInput;
  format?: DateTimeFormat;
  mono?: boolean;
  className?: string;
}) {
  return (
    <time
      dateTime={toIso(value)}
      title={formatDateLong(value) + " · " + formatTime(value)}
      className={cn(mono && "font-mono text-[0.92em] tabular-nums", className)}
    >
      {FORMATTERS[format](value, reference)}
    </time>
  );
}
