import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Personal data encryption and blind indexes.
 *
 * Ciphertext format: v1:<iv base64url>:<ciphertext+authTag base64url>
 *   AES-256-GCM, 12 byte random IV, 16 byte auth tag. "v1" is the key version: on rotation a
 *   new version is added, old values stay readable and move to the new version when rewritten.
 *
 * Blind index: HMAC-SHA256(BLIND_INDEX_KEY, normalize(value)) as hex. Deterministic, so equality
 * lookups work without storing plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = "v1";

let keyring: Map<string, Buffer> | undefined;

function getKeyring(): Map<string, Buffer> {
  keyring ??= new Map([[CURRENT_KEY_VERSION, Buffer.from(env.DATA_ENCRYPTION_KEY, "base64")]]);
  return keyring;
}

let blindKey: Buffer | undefined;
function getBlindIndexKey(): Buffer {
  blindKey ??= Buffer.from(env.BLIND_INDEX_KEY, "base64");
  return blindKey;
}

/** Encrypts plaintext with AES-256-GCM. Returns a `v1:…:…` string safe to store. */
export function encrypt(plaintext: string): string {
  const key = getKeyring().get(CURRENT_KEY_VERSION)!;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${CURRENT_KEY_VERSION}:${iv.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/** Decrypts `encrypt` output. Throws on malformed input, wrong key or tampered data. */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format.");
  const [version, ivPart, dataPart] = parts as [string, string, string];
  const key = getKeyring().get(version);
  if (!key) throw new Error(`Unknown encryption key version: ${version}`);

  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  if (iv.length !== IV_LENGTH || data.length < TAG_LENGTH) throw new Error("Invalid ciphertext format.");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(data.subarray(data.length - TAG_LENGTH));
  return Buffer.concat([decipher.update(data.subarray(0, data.length - TAG_LENGTH)), decipher.final()]).toString(
    "utf8",
  );
}

export function encryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : encrypt(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : decrypt(value);
}

/** Normalization before hashing: NFC + trim + lowercase (locale independent). */
export function normalizeForIndex(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

/**
 * Deterministic searchable hash (hex, 64 chars).
 * @example users.emailHash = blindIndex(email); users.studentNoHash = blindIndex(studentNo)
 */
export function blindIndex(value: string): string {
  return createHmac("sha256", getBlindIndexKey()).update(normalizeForIndex(value), "utf8").digest("hex");
}

export { maskEmail, maskStudentNo } from "@/lib/mask";

/* ──────────────────────────── Tokens ──────────────────────────── */

/** Cryptographically random URL-safe token (default 32 bytes = 256 bit). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex. Session and email tokens are stored hashed, never raw. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/* ─────────────────────── Signed values (SESSION_SECRET) ─────────────────────── */

function hmacSign(value: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(value, "utf8").digest("base64url");
}

/** Signs a value as `${value}.${mac}`: tamper-proof, not secret (OAuth state, short-lived cookies). */
export function sign(value: string): string {
  return `${value}.${hmacSign(value)}`;
}

/** Verifies `sign` output; returns the original value or null. */
export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  return safeEqual(signed.slice(idx + 1), hmacSign(value)) ? value : null;
}

/** For tests: clears key caches. */
export function __resetCryptoCacheForTests() {
  keyring = undefined;
  blindKey = undefined;
}
