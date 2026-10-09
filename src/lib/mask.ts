/**
 * Maskeleme yardımcıları (saf fonksiyonlar; istemci ve sunucuda kullanılabilir).
 *
 * ÖNEMLİ: Maskelenmiş değer göstermek gereken yerde maskeleme SUNUCUDA yapılır ve istemciye
 * sadece maskeli değer gönderilir. Tam değeri client component'e prop olarak geçirmeyin.
 */

/**
 * Öğrenci numarasını maskeler: ilk 2 ve son 2 karakter açık, arası `*`.
 * @example maskStudentNo("260000009") // "26*****79"
 * 4 veya daha kısa değerler tamamen maskelenir: "1234" → "****".
 */
export function maskStudentNo(value: string): string {
  const v = value.trim();
  if (v.length <= 4) return "*".repeat(v.length);
  return `${v.slice(0, 2)}${"*".repeat(v.length - 4)}${v.slice(-2)}`;
}

/**
 * E-posta adresini maskeler. Yerel kısım rakamlardan oluşuyorsa (öğrenci no) `maskStudentNo`
 * kuralı, aksi halde ilk 2 karakter + `***` uygulanır. Domain açık kalır.
 * @example maskEmail("260000009@ogr.mku.edu.tr") // "26*****79@ogr.mku.edu.tr"
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
