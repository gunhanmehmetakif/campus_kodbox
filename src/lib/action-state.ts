import { z } from "zod";

/**
 * Server Action dönüş tipi — TÜM form action'ları bu sözleşmeyi kullanır.
 * Ayrıntılı kalıp: CONVENTIONS.md → "Server Action kalıbı".
 *
 *   "use server";
 *   export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
 *     const user = await requireRole("instructor");
 *     const parsed = parseForm(schema, formData);
 *     if (!parsed.ok) return parsed.result;
 *     …
 *     return ok("Ders oluşturuldu.");
 *   }
 *
 * İstemcide: const [state, action] = useActionState(createCourse, initialActionState);
 */

/** Alan adı → hata mesajları. Formda <FormField error={state?.fieldErrors?.code} /> ile gösterilir. */
export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionSuccess<T = undefined> = {
  ok: true;
  /** Toast veya satır içi başarı metni. Buton fiiliyle aynı fiil: "Yayınla" → "Yayınlandı". */
  message?: string;
  data?: T;
};

export type ActionFailure = {
  ok: false;
  /** Formun üstünde gösterilen genel hata. */
  error?: string;
  /** Alan bazlı hatalar. */
  fieldErrors?: FieldErrors;
  /**
   * Gönderilen değerler (şifreler HARİÇ). React 19 form action'ı sonrası form sıfırlanır;
   * hata durumunda alanları `defaultValue={state?.values?.x}` ile geri doldurmak için.
   */
  values?: Record<string, string>;
};

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

/** useActionState durumu: ilk render'da null. */
export type ActionState<T = undefined> = ActionResult<T> | null;

export const initialActionState = null;

export function ok<T = undefined>(message?: string, data?: T): ActionSuccess<T> {
  return { ok: true, message, data };
}

export function fail(error?: string, fieldErrors?: FieldErrors, values?: Record<string, string>): ActionFailure {
  return { ok: false, error, fieldErrors, values };
}

/** Değerlerin içinden gizli alanları atarak string kopyasını çıkarır. */
const SECRET_FIELD = /pass(word)?|token|secret|cf-turnstile-response/i;

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION") || SECRET_FIELD.test(key)) continue;
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Zod hatasını FieldErrors'a çevirir. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/**
 * FormData'yı Zod şemasıyla doğrular.
 * - Aynı isimli birden fazla alan (checkbox grubu, çoklu link) dizi olarak toplanır.
 * - Başarısızsa `result` doğrudan action'dan döndürülebilir.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  options: { error?: string } = {},
): { ok: true; data: z.infer<S> } | { ok: false; result: ActionFailure } {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    result: fail(options.error ?? "Formda düzeltilmesi gereken alanlar var.", zodFieldErrors(parsed.error), formValues(formData)),
  };
}

/** İlk alan hatası (tek satırlık gösterim için). */
export function firstError(errors: string[] | undefined): string | undefined {
  return errors?.[0];
}
