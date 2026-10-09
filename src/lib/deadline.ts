/**
 * Teslim Şeridi (deadline ribbon) durum hesabı — saf fonksiyon (DESIGN.md · İmza öğesi).
 * Bileşen: src/components/deadline-ribbon.tsx. Ödev listeleri/sıralama da bu fonksiyonu kullanır.
 */

import { TIME } from "./dates";

export type DeadlineInput = {
  /** Yayın anı (şeridin başlangıcı). null ise şerit `dueAt - 14 gün`den başlar. */
  publishAt: Date | null;
  /** Son teslim. null = süresiz. */
  dueAt: Date | null;
  lateAllowed?: boolean;
  /** Geç teslim son kabul. lateAllowed && null = süresiz geç teslim. */
  lateUntil?: Date | null;
  /** Öğrencinin (son) teslim anı. Doluysa durum "submitted". */
  submittedAt?: Date | null;
};

export type DeadlineStatus =
  /** Süresiz ödev — şerit yok, "Süresiz" rozeti. */
  | "open-ended"
  /** Henüz yayınlanmamış (zamanlanmış; eğitmen görünümü). */
  | "scheduled"
  /** Son tarihe 48 saatten fazla var. */
  | "upcoming"
  /** Son 48 saat. */
  | "due-soon"
  /** Son tarih geçti, geç teslim penceresi açık. */
  | "late-window"
  /** Son tarih (ve varsa geç teslim penceresi) geçti. */
  | "overdue"
  /** Teslim edildi. */
  | "submitted";

export type DeadlineTone = "laurel" | "saffron" | "brick" | "sky" | "neutral";

export type DeadlineState = {
  status: DeadlineStatus;
  tone: DeadlineTone;
  /** Hedef ana göre kalan (pozitif) veya geçen (negatif) ms. Hedef: dueAt, geç pencerede lateUntil. */
  remainingMs: number | null;
  /** Hedef an (sayacın saydığı). */
  targetAt: Date | null;
  /** Teslim geç mi yapıldı? (submitted durumunda) */
  submittedLate: boolean;
  /** Sayaç saniye hassasiyetinde mi güncellenmeli? (son 1 saat) */
  needsSecondTicks: boolean;
};

/** Son tarihe bu kadar kala "yaklaşan" (saffron) sayılır. */
export const DUE_SOON_MS = 48 * TIME.HOUR;
/** Varsayılan şerit başlangıcı (yayın tarihi bilinmiyorsa): son tarihten 14 gün önce. */
export const DEFAULT_SPAN_MS = 14 * TIME.DAY;

export function computeDeadline(input: DeadlineInput, now: Date): DeadlineState {
  const { publishAt, dueAt, submittedAt } = input;
  const lateAllowed = Boolean(input.lateAllowed && dueAt);
  const lateUntil = lateAllowed ? (input.lateUntil ?? null) : null;
  const t = now.getTime();

  if (submittedAt) {
    return {
      status: "submitted",
      tone: "sky",
      remainingMs: dueAt ? dueAt.getTime() - t : null,
      targetAt: dueAt,
      submittedLate: Boolean(dueAt && submittedAt.getTime() > dueAt.getTime()),
      needsSecondTicks: false,
    };
  }

  if (publishAt && publishAt.getTime() > t) {
    const ms = publishAt.getTime() - t;
    return {
      status: "scheduled",
      tone: "neutral",
      remainingMs: ms,
      targetAt: publishAt,
      submittedLate: false,
      needsSecondTicks: ms <= TIME.HOUR,
    };
  }

  if (!dueAt) {
    return { status: "open-ended", tone: "neutral", remainingMs: null, targetAt: null, submittedLate: false, needsSecondTicks: false };
  }

  const toDue = dueAt.getTime() - t;
  if (toDue > 0) {
    return {
      status: toDue <= DUE_SOON_MS ? "due-soon" : "upcoming",
      tone: toDue <= DUE_SOON_MS ? "saffron" : "laurel",
      remainingMs: toDue,
      targetAt: dueAt,
      submittedLate: false,
      needsSecondTicks: toDue <= TIME.HOUR,
    };
  }

  if (lateAllowed && (lateUntil === null || lateUntil.getTime() > t)) {
    const toLate = lateUntil ? lateUntil.getTime() - t : null;
    return {
      status: "late-window",
      tone: "brick",
      remainingMs: toLate ?? toDue,
      targetAt: lateUntil ?? dueAt,
      submittedLate: false,
      needsSecondTicks: toLate !== null && toLate <= TIME.HOUR,
    };
  }

  const end = lateUntil ?? dueAt;
  return {
    status: "overdue",
    tone: "brick",
    remainingMs: end.getTime() - t,
    targetAt: end,
    submittedLate: false,
    needsSecondTicks: false,
  };
}

/* ─────────────────────────────── Şerit geometrisi ─────────────────────────────── */

export type RibbonGeometry = {
  /** Tüm değerler 0–1 arası oran (şerit genişliğine göre). */
  due: number;
  /** Geç teslim penceresinin sonu (kesikli bölüm). Süresiz geç teslimde 1. null = pencere yok. */
  lateEnd: number | null;
  /** Şimdi işaretçisi. Eksen dışındaysa kenara kıstırılır. */
  now: number;
  /** Dolu kısmın sonu. */
  fill: number;
  /** Teslim anı (varsa). */
  submitted: number | null;
  /** Şimdi eksenin dışında mı? ("önce" / "sonra") */
  nowOutside: "before" | "after" | null;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Zaman → konum eşlemesi.
 * - `axis` verilirse (Yaklaşan teslimler: bugün → +14 gün) doğrusal ortak eksen kullanılır.
 * - Aksi halde: yayın → son tarih ana bölüm; geç teslim penceresi varsa okunabilirlik için
 *   kesikli bölüm genişliğin %18–35'i arasında tutulur (orantılı ama kıstırılmış).
 */
export function computeRibbonGeometry(
  input: DeadlineInput,
  now: Date,
  axis?: { start: Date; end: Date },
): RibbonGeometry | null {
  const { dueAt } = input;
  if (!dueAt) return null;
  const lateAllowed = Boolean(input.lateAllowed);
  const lateUntil = lateAllowed ? (input.lateUntil ?? null) : null;
  const t = now.getTime();
  const submittedAt = input.submittedAt ?? null;

  let map: (ms: number) => number;
  let lateEnd: number | null = null;

  if (axis) {
    const a = axis.start.getTime();
    const span = Math.max(1, axis.end.getTime() - a);
    map = (ms) => (ms - a) / span;
    if (lateAllowed) lateEnd = lateUntil ? clamp01(map(lateUntil.getTime())) : 1;
  } else {
    const start = (input.publishAt ?? new Date(dueAt.getTime() - DEFAULT_SPAN_MS)).getTime();
    const due = dueAt.getTime();
    const mainSpan = Math.max(1, due - start);

    if (lateAllowed) {
      const lateSpan = lateUntil ? Math.max(1, lateUntil.getTime() - due) : mainSpan * 0.25;
      const lateShare = Math.min(0.35, Math.max(0.18, lateSpan / (mainSpan + lateSpan)));
      const dueAtPos = 1 - lateShare;
      map = (ms) =>
        ms <= due ? ((ms - start) / mainSpan) * dueAtPos : dueAtPos + ((ms - due) / lateSpan) * lateShare;
      lateEnd = 1;
    } else {
      map = (ms) => (ms - start) / mainSpan;
    }
  }

  const rawNow = map(t);
  const nowPos = clamp01(rawNow);
  const duePos = clamp01(map(dueAt.getTime()));
  const submittedPos = submittedAt ? clamp01(map(submittedAt.getTime())) : null;
  const fill = submittedPos ?? nowPos;

  return {
    due: duePos,
    lateEnd,
    now: nowPos,
    fill,
    submitted: submittedPos,
    nowOutside: rawNow < 0 ? "before" : rawNow > 1 ? "after" : null,
  };
}
