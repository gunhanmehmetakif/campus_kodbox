import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword, verifyPasswordDummy } from "@/lib/server/password";

describe("argon2id", () => {
  it("hash'ler ve doğrular", async () => {
    const hash = await hashPassword("Kodbox2026");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(hash, "Kodbox2026")).toBe(true);
    expect(await verifyPassword(hash, "kodbox2026")).toBe(false);
  });

  it("aynı şifre farklı tuzla farklı hash üretir", async () => {
    expect(await hashPassword("abc12345")).not.toBe(await hashPassword("abc12345"));
  });

  it("bozuk hash'te false döner, hata fırlatmaz", async () => {
    expect(await verifyPassword("bozuk", "x")).toBe(false);
    expect(await verifyPasswordDummy("x")).toBe(false);
  });
});
