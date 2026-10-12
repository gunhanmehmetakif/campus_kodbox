import { CalendarClock, FileCheck2, Hourglass, Star } from "lucide-react";

export type AssignmentRulesData = {
  submissionType: "link" | "none";
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
  latePenaltyType: "none" | "points" | "percent";
  latePenaltyValue: number | null;
  maxScore: number | null;
  allowAnyLink: boolean;
};

const TZ = "Europe/Istanbul";

function istanbulParts(d: Date, withYear: boolean, withWeekday: boolean) {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    weekday: withWeekday ? "short" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    weekday: get("weekday"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** "14 Eki 2026 Sal 23:59" */
export function formatDueDate(d: Date): string {
  const p = istanbulParts(d, true, true);
  return `${p.day} ${p.month} ${p.year} ${p.weekday} ${p.hour}:${p.minute}`;
}

/** "14 Eki 21:03" */
export function formatShortDateTime(d: Date | string): string {
  const p = istanbulParts(typeof d === "string" ? new Date(d) : d, false, false);
  return `${p.day} ${p.month} ${p.hour}:${p.minute}`;
}

/** Dative suffix vowel of a spoken number (Turkish vowel harmony): "a", "e", "ya", "ye". */
function dativeSuffix(n: number): string {
  const last = n % 10;
  if (last === 0) return [0, 10, 30, 40].includes(n) ? "a" : "ye";
  return ["", "e", "ye", "e", "e", "e", "ya", "ye", "e", "a"][last];
}

/** "16 Eki 23:59'a" */
function formatLateUntil(d: Date): string {
  const p = istanbulParts(d, false, false);
  const minute = Number(p.minute);
  const spoken = minute === 0 ? Number(p.hour) : minute;
  return `${p.day} ${p.month} ${p.hour}:${p.minute}'${dativeSuffix(spoken)}`;
}

export function penaltyText(a: AssignmentRulesData): string | null {
  if (a.latePenaltyType === "none" || a.latePenaltyValue === null) return null;
  const value = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(a.latePenaltyValue);
  return a.latePenaltyType === "percent" ? `−%${value}` : `−${value} puan`;
}

/** One-line rules summary for feed cards (the due date is shown separately). */
export function AssignmentRulesLine({ a }: { a: AssignmentRulesData }) {
  const penalty = penaltyText(a);
  const parts = [
    a.maxScore !== null ? `${a.maxScore} puan` : "Puanlanmaz",
    a.lateAllowed
      ? `Geç teslim: ${[a.lateUntil ? `${formatLateUntil(a.lateUntil)} kadar` : "süresiz", penalty].filter(Boolean).join(", ")}`
      : "Geç teslim yok",
    ...(a.submissionType === "none" ? [] : [a.allowAnyLink ? "Her link" : "Google Drive linki"]),
  ];
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

/** Row-by-row rules summary shared by the student and instructor assignment pages. */
export function AssignmentRules({ a }: { a: AssignmentRulesData }) {
  const penalty = penaltyText(a);
  const late = a.lateAllowed
    ? [a.lateUntil ? `${formatLateUntil(a.lateUntil)} kadar` : "Süresiz kabul edilir", penalty]
        .filter(Boolean)
        .join(", ")
    : "Geç teslim kabul edilmez";

  const rows = [
    { icon: CalendarClock, label: "Son teslim", value: a.dueAt ? formatDueDate(a.dueAt) : "Süresiz" },
    { icon: Hourglass, label: "Geç teslim", value: late },
    { icon: Star, label: "Puan", value: a.maxScore !== null ? `${a.maxScore} üzerinden` : "Puanlanmaz" },
    {
      icon: FileCheck2,
      label: "Teslim",
      value:
        a.submissionType === "none"
          ? "Teslim gerekmiyor"
          : a.allowAnyLink
            ? "Her link"
            : "Google Drive linki",
    },
  ];

  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
