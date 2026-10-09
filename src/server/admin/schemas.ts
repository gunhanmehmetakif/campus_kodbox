import { z } from "zod";

import { isValidStaffLocalPart, normalizeLocalPart } from "@/lib/identity";

/**
 * Admin form schemas (docs/fazlar/F2-F3-admin-ders.md section 2). Pure module: safe for
 * client-side live validation. Field names match the form field names.
 */

const id = z.string({ error: "Geçersiz kayıt." }).uuid("Geçersiz kayıt.");

const displayName = z
  .string({ error: "Görünen adı girin." })
  .trim()
  .min(2, "Görünen ad en az 2 karakter olmalı.")
  .max(120, "Görünen ad en fazla 120 karakter olabilir.");

/** Empty form inputs arrive as "" and mean "not set". */
const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih girin.")
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Geçerli bir tarih girin.")
    .optional(),
);

const termName = z
  .string({ error: "Dönem adını girin." })
  .trim()
  .min(2, "Dönem adı en az 2 karakter olmalı.")
  .max(80, "Dönem adı en fazla 80 karakter olabilir.");

type TermDates = { startsOn?: string; endsOn?: string };
const datesInOrder = {
  path: ["endsOn"],
  message: "Bitiş tarihi başlangıçtan önce olamaz.",
};
const endsAfterStart = (v: TermDates) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn;

export const createInstructorSchema = z.object({
  local: z
    .string({ error: "Mail adresini girin." })
    .trim()
    .min(1, "Mail adresini girin.")
    .max(254, "Mail adresi çok uzun.")
    .refine((v) => isValidStaffLocalPart(normalizeLocalPart(v)), "Geçerli bir mail adresi girin."),
  displayName,
});
export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;

export const updateInstructorSchema = z.object({ id, displayName });
export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;

export const resetInstructorPasswordSchema = z.object({ id });
export type ResetInstructorPasswordInput = z.infer<typeof resetInstructorPasswordSchema>;

export const setUserStatusSchema = z.object({
  id,
  status: z.enum(["active", "disabled"], { error: "Geçersiz durum." }),
});
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const createTermSchema = z
  .object({ name: termName, startsOn: optionalDate, endsOn: optionalDate })
  .refine(endsAfterStart, datesInOrder);
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = z
  .object({ id, name: termName, startsOn: optionalDate, endsOn: optionalDate })
  .refine(endsAfterStart, datesInOrder);
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export const setActiveTermSchema = z.object({ id });
export type SetActiveTermInput = z.infer<typeof setActiveTermSchema>;

export const archiveTermCoursesSchema = z.object({ id });
export type ArchiveTermCoursesInput = z.infer<typeof archiveTermCoursesSchema>;

export const updateSchoolSchema = z.object({
  name: z
    .string({ error: "Okul adını girin." })
    .trim()
    .min(2, "Okul adı en az 2 karakter olmalı.")
    .max(120, "Okul adı en fazla 120 karakter olabilir."),
  studentNoRegex: z
    .string({ error: "Numara kuralını girin." })
    .trim()
    .min(1, "Numara kuralını girin.")
    .max(200, "Numara kuralı çok uzun.")
    .refine((v) => {
      try {
        new RegExp(v);
        return true;
      } catch {
        return false;
      }
    }, "Geçerli bir düzenli ifade (regex) girin."),
});
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
