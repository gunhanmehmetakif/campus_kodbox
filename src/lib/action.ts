/**
 * Server action result shape (docs/SOZLESME.md 2.2). Pure module, safe for client and server.
 * `error` and `fieldErrors` are Turkish and shown to the user as is.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const GENERIC_ERROR = "Bir şeyler ters gitti, tekrar deneyin.";

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

/** Converts a Zod error into an ActionResult failure (fieldErrors keyed by field path). */
export function failFromZod(
  error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> },
  message = "Lütfen formdaki hataları düzeltin.",
) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(message, fieldErrors);
}

/** Logs an unexpected error and returns the generic user-facing failure. */
export function failUnexpected(error: unknown) {
  console.error("[action] unexpected error", error);
  return fail(GENERIC_ERROR);
}
