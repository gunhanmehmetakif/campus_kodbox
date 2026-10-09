import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Kişisel veri şifreleme ve blind index yardımcıları (PLAN.md §3).
 *
 * ŞİFRELİ METİN BİÇİMİ
 *   v1:<iv base64url>:<ciphertext+authTag base64url>
 *   - AES-256-GCM, 12 byte rastgele IV, 16 byte auth tag.
 *   - "v1" anahtar sürümüdür. Anahtar rotasyonunda yeni sürüm (v2) eklenir; eski sürümle
 *     şifrelenmiş değerler okunmaya devam eder, yeniden yazılırken yeni sürüme geçer.
 *
 * BLIND INDEX
 *   HMAC-SHA256(BLIND_INDEX_KEY, normalize(value)) → hex (64 karakter).
 *   Normalize: trim + Türkçe'ye duyarsız küçük harf (Unicode NFC). Aynı girdi her zaman aynı
 *   hash'i verir; böylece düz metin saklamadan eşitlik araması yapılabilir.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = "v1";

let keyring: Map<string, Buffer> | undefined;

function getKeyring(): Map<string, Buffer> {
  if (!keyring) {
    keyring = new Map([[CURRENT_KEY_VERSION, Buffer.from(env.DATA_ENCRYPTION_KEY, "base64")]]);
  }
  return keyring;
}

let blindKey: Buffer | undefined;
function getBlindIndexKey(): Buffer {
  blindKey ??= Buffer.from(env.BLIND_INDEX_KEY, "base64");
  return blindKey;
}

/** Düz metni AES-256-GCM ile şifreler. Sonuç `v1:…:…` biçiminde, DB'ye yazılabilir string'dir. */
export function encrypt(plaintext: string): string {
  const key = getKeyring().get(CURRENT_KEY_VERSION)!;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${CURRENT_KEY_VERSION}:${iv.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/**
 * `encrypt` çıktısını çözer. Biçim bozuksa, anahtar yanlışsa veya veri değiştirilmişse hata fırlatır
 * (GCM bütünlük doğrulaması).
 */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Şifreli değer biçimi geçersiz.");
  const [version, ivPart, dataPart] = parts as [string, string, string];
  const key = getKeyring().get(version);
  if (!key) throw new Error(`Bilinmeyen şifreleme anahtarı sürümü: ${version}`);

  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  if (iv.length !== IV_LENGTH || data.length < TAG_LENGTH) throw new Error("Şifreli değer biçimi geçersiz.");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(data.subarray(data.length - TAG_LENGTH));
  return Buffer.concat([decipher.update(data.subarray(0, data.length - TAG_LENGTH)), decipher.final()]).toString(
    "utf8",
  );
}

/** null/undefined geçirgen varyantlar (nullable sütunlar için). */
export function encryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : encrypt(value);
}
export function decryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : decrypt(value);
}

/** Blind index öncesi normalizasyon: trim + NFC + küçük harf (tr-TR değil, locale'den bağımsız). */
export function normalizeForIndex(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

/**
 * Aranabilir, deterministik HMAC-SHA256 blind index (hex).
 * @example users.emailHash = blindIndex(email); users.studentNoHash = blindIndex(studentNo)
 */
export function blindIndex(value: string): string {
  return createHmac("sha256", getBlindIndexKey()).update(normalizeForIndex(value), "utf8").digest("hex");
}

/** Maskeleme saf fonksiyonlardır; kolaylık için buradan da dışa aktarılır (bkz. src/lib/mask.ts). */
export { maskEmail, maskStudentNo } from "@/lib/mask";

/* ──────────────────────────── Token yardımcıları ──────────────────────────── */

/** Kriptografik rastgele, URL-güvenli token (varsayılan 32 byte = 256 bit). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex. Oturum ve mail token'larını DB'de saklarken kullanılır (token'ın kendisi saklanmaz). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Sabit zamanlı string karşılaştırma (uzunluk farkını da sızdırmadan). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/* ─────────────────────────── İmzalı değerler (SESSION_SECRET) ─────────────────────────── */

function hmacSign(value: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(value, "utf8").digest("base64url");
}

/**
 * Değeri HMAC ile imzalar: `${value}.${imza}`. Gizli değil, sadece değiştirilemez yapar.
 * Kullanım: OAuth state / kısa ömürlü çerezler.
 */
export function sign(value: string): string {
  return `${value}.${hmacSign(value)}`;
}

/** `sign` çıktısını doğrular; geçerliyse orijinal değeri, değilse null döner. */
export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  return safeEqual(signed.slice(idx + 1), hmacSign(value)) ? value : null;
}

/** Testler için anahtar önbelleklerini temizler. */
export function __resetCryptoCacheForTests() {
  keyring = undefined;
  blindKey = undefined;
}
