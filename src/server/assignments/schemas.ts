import { z } from "zod";

import { parseIstanbulLocal } from "./rules";

/**
 * Assignment form schemas (docs/fazlar/F4-odev-teslim.md sections 2-3). Pure module: safe for
 * client-side validation. Actions take `(prevState, formData)`; field names match form fields.
 */

const id = (message = "Geçersiz kayıt.") => z.string({ error: message }).trim().uuid({ error: message });

export const ASSIGNMENT_TITLE_MAX = 200;
export const ASSIGNMENT_BODY_MAX = 20000;
export const ASSIGNMENT_LINKS_MAX = 20;
export const MAX_SCORE_LIMIT = 1000;
export const FEEDBACK_MAX = 5000;
export const SUBMISSION_URL_MAX = 2000;

/** Accepts "72,5" and "72.5"; returns NaN for anything else. */
export function parseDecimal(value: string): number {
  const v = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(v)) return Number.NaN;
  return Number(v);
}

const flag = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const emptyToUndefined = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

const optionalLocalDate = (message: string) =>
  z
    .string()
    .optional()
    .transform(emptyToUndefined)
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      try {
        return parseIstanbulLocal(v);
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    });

const optionalDecimal = (message: string) =>
  z
    .string()
    .optional()
    .transform(emptyToUndefined)
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const n = parseDecimal(v);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return n;
    });

const linkItem = z.object({
  title: z.string().trim().min(1, "Link başlığını girin.").max(200, "Link başlığı çok uzun."),
  url: z
    .string()
    .trim()
    .max(2000, "Link çok uzun.")
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Link http veya https ile başlayan geçerli bir adres olmalı."),
});

const links = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value || !value.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as unknown[];
    } catch {
      // falls through to the issue below
    }
    ctx.addIssue({ code: "custom", message: "Linkler okunamadı." });
    return z.NEVER;
  })
  .pipe(z.array(linkItem).max(ASSIGNMENT_LINKS_MAX, `En fazla ${ASSIGNMENT_LINKS_MAX} link ekleyebilirsiniz.`));

export const saveAssignmentSchema = z
  .object({
    courseId: id(),
    id: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.uuid({ error: "Geçersiz kayıt." }).optional()),
    title: z
      .string({ error: "Başlığı girin." })
      .trim()
      .min(1, "Başlığı girin.")
      .max(ASSIGNMENT_TITLE_MAX, `Başlık en fazla ${ASSIGNMENT_TITLE_MAX} karakter olabilir.`),
    bodyMd: z
      .string()
      .max(ASSIGNMENT_BODY_MAX, `Metin en fazla ${ASSIGNMENT_BODY_MAX} karakter olabilir.`)
      .optional()
      .transform((v) => v ?? ""),
    links,
    submissionType: z.enum(["link", "none"], { error: "Teslim türünü seçin." }),
    allowAnyLink: flag,
    dueAt: optionalLocalDate("Son teslim tarihi geçersiz."),
    lateAllowed: flag,
    lateUntil: optionalLocalDate("Geç teslim son tarihi geçersiz."),
    latePenaltyType: z.enum(["none", "points", "percent"], { error: "Ceza türünü seçin." }).default("none"),
    latePenaltyValue: optionalDecimal("Ceza değeri sayı olmalı."),
    grading: flag,
    maxScore: optionalDecimal("Maksimum puan sayı olmalı."),
    intent: z.enum(["draft", "publish"], { error: "Geçersiz istek." }),
  })
  .superRefine((v, ctx) => {
    if (v.lateAllowed && !v.dueAt) {
      ctx.addIssue({ code: "custom", path: ["lateAllowed"], message: "Geç teslim için son teslim tarihi gerekir." });
    }
    if (v.lateAllowed && v.lateUntil && v.dueAt && v.lateUntil.getTime() <= v.dueAt.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["lateUntil"],
        message: "Geç teslim son tarihi, son teslim tarihinden sonra olmalı.",
      });
    }
    if (v.lateAllowed && v.latePenaltyType !== "none") {
      const p = v.latePenaltyValue;
      if (p === undefined || p <= 0) {
        ctx.addIssue({ code: "custom", path: ["latePenaltyValue"], message: "Ceza değerini girin." });
      } else if (v.latePenaltyType === "percent" && p > 100) {
        ctx.addIssue({ code: "custom", path: ["latePenaltyValue"], message: "Ceza yüzdesi 0-100 arasında olmalı." });
      }
    }
    if (v.grading) {
      const m = v.maxScore;
      if (m === undefined || m <= 0 || m > MAX_SCORE_LIMIT) {
        ctx.addIssue({
          code: "custom",
          path: ["maxScore"],
          message: `Maksimum puan 0'dan büyük ve en fazla ${MAX_SCORE_LIMIT} olmalı.`,
        });
      }
    }
  });
export type SaveAssignmentInput = z.infer<typeof saveAssignmentSchema>;

export const deleteAssignmentSchema = z.object({ id: id() });
export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  submissionId: id(),
  score: z
    .string()
    .optional()
    .transform(emptyToUndefined)
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const n = parseDecimal(v);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: "custom", message: "Puan sayı olmalı." });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
  feedback: z
    .string()
    .max(FEEDBACK_MAX, `Geri bildirim en fazla ${FEEDBACK_MAX} karakter olabilir.`)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

export const publishScoresSchema = z.object({
  assignmentId: id(),
  submissionIds: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.uuid({ error: "Geçersiz kayıt." })).max(5000).optional()),
});
export type PublishScoresInput = z.infer<typeof publishScoresSchema>;

export const submitAssignmentSchema = z.object({
  assignmentId: id(),
  url: z
    .string({ error: "Geçerli bir bağlantı girin." })
    .trim()
    .min(1, "Geçerli bir bağlantı girin.")
    .max(SUBMISSION_URL_MAX, "Bağlantı çok uzun."),
});
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const checkSubmissionLinkSchema = submitAssignmentSchema;
export type CheckSubmissionLinkInput = SubmitAssignmentInput;
