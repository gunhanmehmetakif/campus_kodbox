import { z } from "zod";

/**
 * Course form schemas (docs/fazlar/F2-F3-admin-ders.md section 3). Pure module: safe for
 * client-side live validation. Field names match the form field names.
 */

const id = (message = "Geçersiz kayıt.") => z.string({ error: message }).trim().uuid({ error: message });

export const COURSE_CODE_MAX = 20;
export const COURSE_NAME_MAX = 150;
export const COURSE_DESCRIPTION_MAX = 2000;
export const POST_TITLE_MAX = 200;
export const POST_BODY_MAX = 20000;
export const POST_LINKS_MAX = 20;
export const ROSTER_TEXT_MAX = 100_000;

/** Upper case (tr-TR) and no whitespace, e.g. "bil 101" -> "BİL101". */
export function normalizeCourseCode(value: string): string {
  return value.replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

const code = z
  .string({ error: "Ders kodunu girin." })
  .transform(normalizeCourseCode)
  .pipe(
    z
      .string()
      .min(1, "Ders kodunu girin.")
      .max(COURSE_CODE_MAX, `Ders kodu en fazla ${COURSE_CODE_MAX} karakter olabilir.`),
  );
const name = z
  .string({ error: "Ders adını girin." })
  .trim()
  .min(1, "Ders adını girin.")
  .max(COURSE_NAME_MAX, `Ders adı en fazla ${COURSE_NAME_MAX} karakter olabilir.`);
const description = z
  .string()
  .trim()
  .max(COURSE_DESCRIPTION_MAX, `Açıklama en fazla ${COURSE_DESCRIPTION_MAX} karakter olabilir.`)
  .optional()
  .transform((v) => (v ? v : undefined));

export const createCourseSchema = z.object({
  code,
  name,
  termId: id("Dönem seçin."),
  description,
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({ id: id(), code, name, description });
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const setCourseArchivedSchema = z.object({
  id: id(),
  archived: z.enum(["true", "false"], { error: "Geçersiz istek." }).transform((v) => v === "true"),
});
export type SetCourseArchivedInput = z.infer<typeof setCourseArchivedSchema>;

export const addRosterSchema = z.object({
  courseId: id(),
  text: z
    .string({ error: "Öğrenci numaralarını yapıştırın." })
    .max(ROSTER_TEXT_MAX, "Liste çok uzun. Daha küçük parçalar halinde ekleyin.")
    .refine((v) => v.trim().length > 0, "Öğrenci numaralarını yapıştırın."),
});
export type AddRosterInput = z.infer<typeof addRosterSchema>;

export const removeRosterEntrySchema = z.object({ courseId: id(), id: id() });
export type RemoveRosterEntryInput = z.infer<typeof removeRosterEntrySchema>;

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

/** `links` arrives as a JSON string of `[{title,url}]`. */
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
  .pipe(z.array(linkItem).max(POST_LINKS_MAX, `En fazla ${POST_LINKS_MAX} link ekleyebilirsiniz.`));

export const savePostSchema = z.object({
  courseId: id(),
  id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.uuid({ error: "Geçersiz kayıt." }).optional()),
  type: z.enum(["announcement", "material"], { error: "İçerik türünü seçin." }),
  title: z
    .string({ error: "Başlığı girin." })
    .trim()
    .min(1, "Başlığı girin.")
    .max(POST_TITLE_MAX, `Başlık en fazla ${POST_TITLE_MAX} karakter olabilir.`),
  bodyMd: z
    .string()
    .max(POST_BODY_MAX, `Metin en fazla ${POST_BODY_MAX} karakter olabilir.`)
    .optional()
    .transform((v) => v ?? ""),
  links,
  intent: z.enum(["draft", "publish"], { error: "Geçersiz istek." }),
});
export type SavePostInput = z.infer<typeof savePostSchema>;

export const deletePostSchema = z.object({ courseId: id(), id: id() });
export type DeletePostInput = z.infer<typeof deletePostSchema>;
