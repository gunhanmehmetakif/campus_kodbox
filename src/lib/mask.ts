/**
 * Masking helpers (pure; client and server safe).
 *
 * Masking must happen on the SERVER; never pass a full value to a client component when only
 * the masked form should be visible.
 */

/**
 * Masks a student number: first 2 and last 1 characters stay visible.
 * @example maskStudentNo("260000009") // "26******9"
 * Values of 4 characters or fewer are fully masked.
 */
export function maskStudentNo(value: string): string {
  const v = value.trim();
  if (v.length <= 4) return "*".repeat(v.length);
  return `${v.slice(0, 2)}${"*".repeat(v.length - 3)}${v.slice(-1)}`;
}

/**
 * Masks an email. Numeric local parts (student numbers) use `maskStudentNo`; others keep the
 * first 2 characters. The domain stays visible.
 * @example maskEmail("260000009@ogr.mku.edu.tr") // "26******9@ogr.mku.edu.tr"
 * @example maskEmail("ahmet.yilmaz@mku.edu.tr")  // "ah***@mku.edu.tr"
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return maskStudentNo(email);
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = /^\d+$/.test(local)
    ? maskStudentNo(local)
    : `${local.slice(0, Math.min(2, local.length - 1))}***`;
  return `${maskedLocal}@${domain}`;
}
