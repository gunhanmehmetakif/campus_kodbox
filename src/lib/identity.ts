/**
 * Okul maili ↔ yerel kısım dönüşümleri (saf fonksiyonlar; istemci + sunucu).
 *
 * Herkes okul mailiyle giriş yapar (PLAN.md §2.1):
 *   Öğrenci  → `${öğrenciNo}@${school.studentEmailDomain}`   (örn. 260000009@ogr.mku.edu.tr)
 *   Personel → `${yerelKısım}@${school.staffEmailDomain}`     (örn. ahmet.yilmaz@mku.edu.tr)
 *
 * Formlarda kullanıcı sadece yerel kısmı yazar; domain sabit ek olarak gösterilir
 * (bkz. components/email-local-input.tsx). Tam mail yapıştırılırsa `@` sonrası kırpılır ve
 * domain'e göre sekme (öğrenci/personel) tespit edilir.
 */

export type LoginKind = "student" | "staff";

/** Kimlik işlemleri için okulun gereken alanları (DB `schools` satırının alt kümesi). */
export type SchoolIdentity = {
  studentEmailDomain: string;
  staffEmailDomain: string;
  studentNoRegex: string;
};

/** MKÜ varsayılanları (seed ile aynı). Tek okul varken istemci tarafında yedek olarak kullanılır. */
export const MKU_IDENTITY: SchoolIdentity = {
  studentEmailDomain: "ogr.mku.edu.tr",
  staffEmailDomain: "mku.edu.tr",
  studentNoRegex: "^\\d{6,12}$",
};

/** Birleşik üst nokta (U+0307): "İ".toLowerCase() → "i̇" sonucundaki fazlalık. */
const COMBINING_DOT_ABOVE = /̇/g;

/**
 * Domain'i normalize eder: trim, baştaki `@` atılır, küçük harf.
 * @example normalizeDomain(" @OGR.MKU.edu.tr ") // "ogr.mku.edu.tr"
 */
export function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^@+/, "").toLowerCase().replace(COMBINING_DOT_ABOVE, "");
}

/**
 * Yerel kısmı normalize eder: NFKC, boşluklar silinir, `@` ve sonrası kırpılır, küçük harf.
 * Türkçe "İ" küçültüldüğünde oluşan birleşik nokta (U+0307) temizlenir.
 * @example normalizeLocalPart("  Ahmet.Yilmaz@mku.edu.tr ") // "ahmet.yilmaz"
 */
export function normalizeLocalPart(input: string): string {
  const withoutDomain = input.normalize("NFKC").split("@")[0] ?? "";
  return withoutDomain.replace(/\s+/g, "").toLowerCase().replace(COMBINING_DOT_ABOVE, "");
}

/** Tam e-postayı yerel kısım + domain olarak ayırır. `@` yoksa domain null. */
export function splitEmail(input: string): { local: string; domain: string | null } {
  const trimmed = input.normalize("NFKC").trim();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return { local: normalizeLocalPart(trimmed), domain: null };
  return { local: normalizeLocalPart(trimmed.slice(0, at)), domain: normalizeDomain(trimmed.slice(at + 1)) };
}

/** Domain'in okulun öğrenci mi personel domain'i mi olduğunu söyler; ikisi de değilse null. */
export function detectKindFromDomain(domain: string, school: SchoolIdentity): LoginKind | null {
  const d = normalizeDomain(domain);
  if (d === normalizeDomain(school.studentEmailDomain)) return "student";
  if (d === normalizeDomain(school.staffEmailDomain)) return "staff";
  return null;
}

/**
 * Kullanıcının giriş kutusuna yazdığı/yapıştırdığı değeri çözümler.
 * - `local`: domain eki olmadan normalize yerel kısım
 * - `detectedKind`: tam mail yapıştırıldıysa ve domain okula aitse sekme önerisi
 * - `foreignDomain`: yapıştırılan domain okula ait değilse o domain (hata mesajı için)
 */
export function parseLoginInput(
  raw: string,
  school: SchoolIdentity,
): { local: string; detectedKind: LoginKind | null; foreignDomain: string | null } {
  const { local, domain } = splitEmail(raw);
  if (!domain) return { local, detectedKind: null, foreignDomain: null };
  const kind = detectKindFromDomain(domain, school);
  return { local, detectedKind: kind, foreignDomain: kind ? null : domain };
}

/** Sekmeye göre domain. */
export function domainForKind(kind: LoginKind, school: SchoolIdentity): string {
  return normalizeDomain(kind === "student" ? school.studentEmailDomain : school.staffEmailDomain);
}

/** Yerel kısım + domain → normalize tam e-posta. */
export function buildEmail(localPart: string, domain: string): string {
  return `${normalizeLocalPart(localPart)}@${normalizeDomain(domain)}`;
}

/** Öğrenci maili numaradan türetilir: `${no}@${studentEmailDomain}`. */
export function studentEmail(studentNo: string, school: Pick<SchoolIdentity, "studentEmailDomain">): string {
  return buildEmail(normalizeStudentNo(studentNo), school.studentEmailDomain);
}

/** Personel maili: `${yerelKısım}@${staffEmailDomain}`. */
export function staffEmail(localPart: string, school: Pick<SchoolIdentity, "staffEmailDomain">): string {
  return buildEmail(localPart, school.staffEmailDomain);
}

/** Öğrenci numarasını normalize eder: boşluklar silinir, NFKC (tam genişlikli rakamlar → ASCII). */
export function normalizeStudentNo(input: string): string {
  return input.normalize("NFKC").replace(/\s+/g, "").split("@")[0] ?? "";
}

/** Okulun regex'ine göre numara geçerli mi? Regex bozuksa (admin hatası) false döner. */
export function isValidStudentNo(studentNo: string, school: Pick<SchoolIdentity, "studentNoRegex">): boolean {
  try {
    return new RegExp(school.studentNoRegex).test(normalizeStudentNo(studentNo));
  } catch {
    return false;
  }
}

/**
 * Personel mail yerel kısmı geçerli mi? (RFC'nin pratik alt kümesi)
 * Harf/rakam ile başlar ve biter; arada . _ - + olabilir; ardışık nokta olamaz; en fazla 64 karakter.
 */
export function isValidStaffLocalPart(local: string): boolean {
  const v = normalizeLocalPart(local);
  return v.length <= 64 && /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/.test(v) && !v.includes("..");
}

/** E-postanın domain kısmı (normalize). `@` yoksa null. */
export function emailDomain(email: string): string | null {
  return splitEmail(email).domain;
}
