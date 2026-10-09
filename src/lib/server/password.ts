import "server-only";

import { hash, verify } from "@node-rs/argon2";

export { newPasswordSchema, passwordRules, passwordSchema } from "@/lib/password-policy";

/**
 * argon2id parametreleri — OWASP 2024 önerisi (m=19 MiB, t=2, p=1).
 * @node-rs/argon2'de varsayılan algoritma argon2id'dir (Algorithm.Argon2id = 2).
 */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Şifreyi argon2id ile hash'ler. Çıktı PHC biçimindedir ($argon2id$v=19$…), tuz içinde gömülüdür. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Şifreyi hash ile doğrular. Hash bozuksa false döner (hata fırlatmaz).
 */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Kullanıcı bulunamadığında da aynı süreyi harcamak için sahte doğrulama
 * (kullanıcı varlığını zamanlama farkıyla sızdırmamak için giriş akışında kullanın).
 */
let dummyHash: Promise<string> | undefined;
export async function verifyPasswordDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("kodbox-dummy-password-0");
  await verifyPassword(await dummyHash, password);
  return false;
}
