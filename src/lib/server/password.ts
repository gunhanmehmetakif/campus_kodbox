import "server-only";

import { hash, verify } from "@node-rs/argon2";

export { newPasswordSchema, passwordRules, passwordSchema } from "@/lib/password-policy";

/** argon2id parameters, OWASP 2024 recommendation (m=19 MiB, t=2, p=1). Algorithm 2 = Argon2id. */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Hashes a password with argon2id. Output is PHC format with the salt embedded. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Verifies a password against a hash. A malformed hash returns false instead of throwing. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Dummy verification that burns the same time when the user does not exist, so login timing
 * does not reveal which accounts exist.
 */
let dummyHash: Promise<string> | undefined;
export async function verifyPasswordDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("kodbox-dummy-password-0");
  await verifyPassword(await dummyHash, password);
  return false;
}
