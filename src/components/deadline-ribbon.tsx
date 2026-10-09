"use client";

import { CheckIcon, InfinityIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useNow } from "@/hooks/use-now";
import {
  formatCountdown,
  formatDateTimeShort,
  formatDurationLong,
  toDate,
  toIso,
  type DateInput,
} from "@/lib/dates";
import {
  computeDeadline,
  computeRibbonGeometry,
  type DeadlineInput,
  type DeadlineState,
  type DeadlineTone,
} from "@/lib/deadline";
import { cn } from "@/lib/utils";

/**
 * TESLİM ŞERİDİ — Kodbox'un imza öğesi (DESIGN.md).
 *
 *   yayın ●━━━━━━━━━━━│▲ şimdi━━━━━━━━━○ son tarih ┄┄┄┄┄┄○ son kabul (geç)
 *
 * - Dolu kısım geçen süre. Renk durumdan: normal laurel · son 48 saat saffron ·
 *   gecikmiş brick · teslim edildi sky + ✓. Geç teslim penceresi kesikli.
 * - Altında mono sayaç: "2g 04s 13dk". Dakikada bir güncellenir; son 1 saatte saniyede bir.
 * - Süresiz ödevde şerit yerine "Süresiz" rozeti.
 * - prefers-reduced-motion: animasyon yok.
 *
 * Kullanım (sunucu bileşeninde, oturum okunduktan sonra):
 *   const now = Date.now();
 *   <DeadlineRibbon publishAt={a.publishAt} dueAt={a.dueAt} lateAllowed={a.lateAllowed}
 *                   lateUntil={a.lateUntil} submittedAt={sub?.submittedAt} serverNow={now} />
 *
 * Varyantlar:
 * - "full" (varsayılan): ödev kartı / detay — şerit + etiket satırı.
 * - "compact": listeler — tek satır şerit + sayaç.
 * - `axis` verilirse ortak zaman ekseni (Yaklaşan teslimler: bugün → +14 gün); şerit "şimdi →
 *   son tarih" aralığını (kalan yükü) gösterir.
 */

export type DeadlineRibbonProps = {
  publishAt?: DateInput | null;
  dueAt: DateInput | null;
  lateAllowed?: boolean;
  lateUntil?: DateInput | null;
  submittedAt?: DateInput | null;
  /** Sunucuda hesaplanan Date.now(). Hydration uyumu ve ilk HTML'de doğru sayaç için. */
  serverNow?: number;
  variant?: "full" | "compact";
  axis?: { start: DateInput; end: DateInput };
  className?: string;
};

const TONE_TEXT: Record<DeadlineTone, string> = {
  laurel: "text-laurel",
  saffron: "text-saffron-ink",
  brick: "text-brick",
  sky: "text-sky",
  neutral: "text-ink-soft",
};
const TONE_BG: Record<DeadlineTone, string> = {
  laurel: "bg-laurel",
  saffron: "bg-saffron",
  brick: "bg-brick",
  sky: "bg-sky",
  neutral: "bg-line-strong",
};
const TONE_BORDER: Record<DeadlineTone, string> = {
  laurel: "border-laurel",
  saffron: "border-saffron",
  brick: "border-brick",
  sky: "border-sky",
  neutral: "border-line-strong",
};

const nullableDate = (v: DateInput | null | undefined) => (v == null ? null : toDate(v));

function pct(n: number) {
  return `${(n * 100).toFixed(3)}%`;
}

/** Ekran okuyucu metni: "Son teslim: 12 Eki 23:59, 2 gün 4 saat kaldı". */
export function deadlineAriaLabel(state: DeadlineState, input: DeadlineInput, now: number | null): string {
  const ref = now ?? input.dueAt?.getTime() ?? 0;
  const due = input.dueAt ? formatDateTimeShort(input.dueAt, ref) : null;
  const remaining = state.remainingMs === null ? null : formatDurationLong(state.remainingMs);
  switch (state.status) {
    case "open-ended":
      return "Süresiz ödev, son teslim tarihi yok";
    case "scheduled":
      return `Henüz yayınlanmadı, yayına ${remaining} var${due ? `. Son teslim: ${due}` : ""}`;
    case "submitted":
      return `Teslim edildi${input.submittedAt ? `: ${formatDateTimeShort(input.submittedAt, ref)}` : ""}${state.submittedLate ? ", geç teslim" : ""}${due ? `. Son teslim: ${due}` : ""}`;
    case "upcoming":
    case "due-soon":
      return now === null ? `Son teslim: ${due}` : `Son teslim: ${due}, ${remaining} kaldı`;
    case "late-window": {
      const lateUntil = input.lateUntil ? formatDateTimeShort(input.lateUntil, ref) : null;
      return lateUntil
        ? `Son teslim geçti (${due}). Geç teslim açık, son kabul: ${lateUntil}, ${remaining} kaldı`
        : `Son teslim geçti (${due}). Geç teslim açık, son kabul tarihi yok`;
    }
    case "overdue":
      return `Son teslim geçti: ${due}${remaining ? `, ${remaining} önce` : ""}`;
  }
}

export function DeadlineRibbon({
  publishAt,
  dueAt,
  lateAllowed = false,
  lateUntil,
  submittedAt,
  serverNow,
  variant = "full",
  axis,
  className,
}: DeadlineRibbonProps) {
  const input: DeadlineInput = {
    publishAt: nullableDate(publishAt),
    dueAt: nullableDate(dueAt),
    lateAllowed,
    lateUntil: nullableDate(lateUntil),
    submittedAt: nullableDate(submittedAt),
  };

  // İlk hesap kaba "şimdi" ile (saniye hassasiyeti gerekip gerekmediğini bilmek için).
  const minuteNow = useNow("minute", serverNow);
  const coarse = minuteNow === null ? null : computeDeadline(input, new Date(minuteNow));
  const secondNow = useNow(coarse?.needsSecondTicks ? "second" : "minute", serverNow);
  const now = coarse?.needsSecondTicks ? secondNow : minuteNow;

  // Sunucuda `serverNow` verilmediyse: son tarihe göre nötr görünüm (sayaçsız).
  const state = now === null ? null : computeDeadline(input, new Date(now));

  if (!input.dueAt) {
    if (state?.status === "submitted") {
      return (
        <div className={cn("flex items-center gap-2 text-label", className)}>
          <SubmittedMark />
          <span className="font-medium text-sky">Teslim edildi</span>
        </div>
      );
    }
    return (
      <Badge variant="neutral" className={cn("gap-1", className)} aria-label="Süresiz ödev, son teslim tarihi yok">
        <InfinityIcon aria-hidden />
        Süresiz
      </Badge>
    );
  }

  const geometry =
    now === null
      ? null
      : computeRibbonGeometry(
          input,
          new Date(now),
          axis ? { start: toDate(axis.start), end: toDate(axis.end) } : undefined,
        );
  const tone: DeadlineTone = state?.tone ?? "neutral";
  const label = state ? deadlineAriaLabel(state, input, now) : deadlineAriaLabel(
      { status: "upcoming", tone: "neutral", remainingMs: null, targetAt: input.dueAt, submittedLate: false, needsSecondTicks: false },
      input,
      null,
    );

  return (
    <div
      role="img"
      aria-label={label}
      data-status={state?.status ?? "pending"}
      className={cn(
        "group/ribbon w-full min-w-0",
        variant === "compact" && "flex items-center gap-3",
        className,
      )}
    >
      <Track
        geometry={geometry}
        tone={tone}
        status={state?.status ?? null}
        axisMode={Boolean(axis)}
        hasLateWindow={lateAllowed}
        hasLateEnd={Boolean(input.lateUntil)}
        pulse={Boolean(state?.needsSecondTicks && state.status !== "submitted")}
        className={variant === "compact" ? "flex-1" : undefined}
      />
      {variant === "full" ? (
        <FullLabels state={state} input={input} now={now} tone={tone} />
      ) : (
        <Countdown state={state} tone={tone} className="shrink-0" />
      )}
    </div>
  );
}

/* ──────────────────────────────────── Şerit ──────────────────────────────────── */

function Track({
  geometry,
  tone,
  status,
  axisMode,
  hasLateWindow,
  hasLateEnd,
  pulse,
  className,
}: {
  geometry: ReturnType<typeof computeRibbonGeometry>;
  tone: DeadlineTone;
  status: DeadlineState["status"] | null;
  axisMode: boolean;
  hasLateWindow: boolean;
  /** Geç teslimin son kabul tarihi var mı? Yoksa kesikli bölüm sağa doğru söner. */
  hasLateEnd: boolean;
  pulse: boolean;
  className?: string;
}) {
  // Sunucuda "şimdi" bilinmiyorsa (serverNow yok): boş iskelet şerit.
  const g = geometry ?? { due: hasLateWindow ? 0.78 : 1, lateEnd: hasLateWindow ? 1 : null, now: 0, fill: 0, submitted: null, nowOutside: null };
  const submitted = status === "submitted";
  const inLate = status === "late-window" || status === "overdue";

  // Ana dolu bölüm
  let fillStart = 0;
  let fillEnd = Math.min(g.fill, g.due);
  if (axisMode) {
    // Ortak eksende: şimdi → son tarih (kalan yük)
    fillStart = submitted ? 0 : g.now;
    fillEnd = submitted ? (g.submitted ?? 0) : g.due;
  }
  const lateFillEnd = !axisMode && inLate && g.lateEnd !== null ? Math.max(g.due, g.fill) : null;

  return (
    <div aria-hidden className={cn("relative h-4 min-w-16", className)}>
      {/* Ortak eksende tüm ekseni gösteren silik taban çizgisi */}
      {axisMode ? <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" /> : null}
      {/* Temel çizgi (yayın → son tarih) */}
      <div
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line"
        style={{ left: 0, width: pct(g.due) }}
      />
      {/* Geç teslim penceresi (kesikli) */}
      {g.lateEnd !== null && g.lateEnd > g.due ? (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 border-t-[3px] border-dashed",
            inLate ? TONE_BORDER[tone] : "border-line-strong",
            inLate ? "opacity-80" : "opacity-70",
            !hasLateEnd && "[mask-image:linear-gradient(to_right,black_55%,transparent)]",
          )}
          style={{ left: pct(g.due), width: pct(g.lateEnd - g.due) }}
        />
      ) : null}
      {/* Dolu kısım */}
      {fillEnd > fillStart ? (
        <div
          className={cn(
            "absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[left,width] duration-700 ease-out",
            TONE_BG[tone],
            axisMode && !submitted && "opacity-85",
          )}
          style={{ left: pct(fillStart), width: pct(fillEnd - fillStart) }}
        />
      ) : null}
      {/* Geç pencerede ilerleme (son tarihten sonrası; kesikli üstüne dolu) */}
      {lateFillEnd !== null && lateFillEnd > g.due ? (
        <div
          className={cn("absolute top-1/2 h-[3px] -translate-y-1/2 rounded-r-full", TONE_BG[tone])}
          style={{ left: pct(g.due), width: pct(lateFillEnd - g.due) }}
        />
      ) : null}

      {/* Yayın noktası ● */}
      {!axisMode ? (
        <span className={cn("absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full", geometry ? TONE_BG[tone] : "bg-line-strong")} />
      ) : null}

      {/* Son tarih ○ */}
      <span
        className={cn(
          "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface",
          geometry && (g.fill >= g.due || axisMode) ? TONE_BORDER[tone] : "border-line-strong",
        )}
        style={{ left: pct(g.due) }}
      />

      {/* Son kabul ○ (geç teslim sonu) */}
      {hasLateEnd && g.lateEnd !== null && g.lateEnd > g.due ? (
        <span
          className={cn(
            "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-surface",
            inLate ? TONE_BORDER[tone] : "border-line-strong",
          )}
          style={{ left: pct(Math.min(g.lateEnd, 1)) }}
        />
      ) : null}

      {/* Teslim ✓ */}
      {submitted && g.submitted !== null ? (
        <span
          className="absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sky text-on-accent ring-2 ring-surface"
          style={{ left: pct(g.submitted) }}
        >
          <CheckIcon className="size-2.5" strokeWidth={3.5} />
        </span>
      ) : null}

      {/* Şimdi │▲ */}
      {geometry && !submitted && g.nowOutside === null ? (
        <span
          className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: pct(g.now) }}
        >
          <span className={cn("h-full w-0.5 rounded-full bg-ink", pulse && "motion-safe:animate-ribbon-pulse")} />
          <span className="absolute -bottom-[3px] size-0 border-x-[4px] border-b-[4px] border-x-transparent border-b-ink" />
        </span>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────── Etiketler ──────────────────────────────────── */

function SubmittedMark() {
  return (
    <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-sky text-on-accent">
      <CheckIcon className="size-2.5" strokeWidth={3.5} />
    </span>
  );
}

function Countdown({ state, tone, className }: { state: DeadlineState | null; tone: DeadlineTone; className?: string }) {
  if (!state || state.remainingMs === null) {
    return <span className={cn("font-mono text-label text-ink-soft tabular-nums", className)}>—</span>;
  }
  if (state.status === "submitted") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-label font-medium text-sky", className)}>
        <SubmittedMark />
        Teslim edildi
      </span>
    );
  }
  const suffix =
    state.status === "overdue" ? "geçti" : state.status === "scheduled" ? "sonra yayında" : "kaldı";
  return (
    <span className={cn("inline-flex items-baseline gap-1 text-label whitespace-nowrap", className)}>
      <span className={cn("font-mono font-medium tabular-nums", TONE_TEXT[tone])} suppressHydrationWarning>
        {formatCountdown(state.remainingMs)}
      </span>
      <span className="text-ink-soft">{suffix}</span>
    </span>
  );
}

function FullLabels({
  state,
  input,
  now,
  tone,
}: {
  state: DeadlineState | null;
  input: DeadlineInput;
  now: number | null;
  tone: DeadlineTone;
}) {
  const ref = now ?? input.dueAt!.getTime();
  const dueText = formatDateTimeShort(input.dueAt!, ref);

  let left: React.ReactNode = (
    <>
      <span className="text-ink-soft">Son teslim</span>{" "}
      <time dateTime={toIso(input.dueAt!)} className="font-mono text-ink tabular-nums">
        {dueText}
      </time>
    </>
  );

  if (state?.status === "late-window" || (state?.status === "overdue" && input.lateAllowed && input.lateUntil)) {
    left = (
      <>
        <span className="font-medium text-brick">Geç teslim</span>
        <span className="text-ink-soft"> · son kabul </span>
        {input.lateUntil ? (
          <time dateTime={toIso(input.lateUntil)} className="font-mono text-ink tabular-nums">
            {formatDateTimeShort(input.lateUntil, ref)}
          </time>
        ) : (
          <span className="text-ink">süresiz</span>
        )}
      </>
    );
  } else if (state?.status === "submitted" && input.submittedAt) {
    left = (
      <>
        <span className="text-ink-soft">Teslim</span>{" "}
        <time dateTime={toIso(input.submittedAt)} className="font-mono text-ink tabular-nums">
          {formatDateTimeShort(input.submittedAt, ref)}
        </time>
        {state.submittedLate ? <span className="font-medium text-brick"> · geç</span> : null}
        <span className="text-ink-soft"> · son teslim </span>
        <span className="font-mono text-ink-soft tabular-nums">{dueText}</span>
      </>
    );
  } else if (state?.status === "scheduled" && input.publishAt) {
    left = (
      <>
        <span className="text-ink-soft">Yayın</span>{" "}
        <time dateTime={toIso(input.publishAt)} className="font-mono text-ink tabular-nums">
          {formatDateTimeShort(input.publishAt, ref)}
        </time>
        <span className="text-ink-soft"> · son teslim </span>
        <span className="font-mono text-ink tabular-nums">{dueText}</span>
      </>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-label">
      <span className="min-w-0 truncate">{left}</span>
      <Countdown state={state} tone={tone} />
    </div>
  );
}
