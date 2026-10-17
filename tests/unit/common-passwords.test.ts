import { describe, expect, it } from "vitest";

import { isCommonPassword } from "@/lib/server/common-passwords";

describe("isCommonPassword", () => {
  it.each(["password1", "Password123", "1234abcd", "abcd1234", "aaaa1111", "a1a1a1a1", "aaaaaaa1"])(
    "rejects %s",
    (pw) => expect(isCommonPassword(pw)).toBe(true),
  );

  it.each([
    "Galatasaray1905",
    "FENERBAHÇE1907",
    "Öğrenci123",
    "Şifre12345",
    "mku123456",
    "Kodbox2024",
    "İstanbul34",
    "Antakya31",
    "QWERTY123",
  ])("rejects Turkish pattern %s", (pw) => expect(isCommonPassword(pw)).toBe(true));

  it.each(["Kirmizi-Elma7", "Mavi.Deniz42x", "Tren-Yolu-2031", "ogrenciler-yurt7", "Zeytin9Agaci", "xK3v9Qm2pL"])(
    "accepts %s",
    (pw) => expect(isCommonPassword(pw)).toBe(false),
  );
});
