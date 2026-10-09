import { describe, expect, it } from "vitest";

import { maskEmail, maskStudentNo } from "@/lib/mask";

import {
  blindIndex,
  decrypt,
  decryptNullable,
  encrypt,
  encryptNullable,
  generateToken,
  normalizeForIndex,
  safeEqual,
  sha256Hex,
  sign,
  unsign,
} from "./crypto";

describe("encrypt / decrypt (AES-256-GCM)", () => {
  it("round-trip: şifrelenen değer aynen geri çözülür", () => {
    for (const value of ["260000009", "ahmet.yilmaz@mku.edu.tr", "ğüşiöç İĞÜŞÖÇ ı", "", "x".repeat(5000)]) {
      expect(decrypt(encrypt(value))).toBe(value);
    }
  });

  it("sürüm önekli biçim üretir: v1:<iv>:<veri>", () => {
    const payload = encrypt("260000009");
    expect(payload).toMatch(/^v1:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]+$/);
    expect(payload).not.toContain("260000009");
  });

  it("her şifrelemede farklı IV kullanır (aynı girdi → farklı çıktı)", () => {
    expect(encrypt("aynı")).not.toBe(encrypt("aynı"));
  });

  it("değiştirilmiş veriyi reddeder (GCM bütünlük)", () => {
    const payload = encrypt("260000009");
    const [v, iv, data] = payload.split(":") as [string, string, string];
    const tampered = `${v}:${iv}:${data.slice(0, -2)}${data.endsWith("A") ? "B" : "A"}${data.slice(-1)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("bozuk biçimi ve bilinmeyen sürümü reddeder", () => {
    expect(() => decrypt("düz-metin")).toThrow(/biçimi/);
    expect(() => decrypt("v9:AAAAAAAAAAAAAAAA:AAAA")).toThrow(/sürüm/);
    expect(() => decrypt("v1:AA:AAAA")).toThrow(/biçimi/);
  });

  it("nullable yardımcılar null'ı geçirir", () => {
    expect(encryptNullable(null)).toBeNull();
    expect(decryptNullable(undefined)).toBeNull();
    expect(decryptNullable(encryptNullable("a"))).toBe("a");
  });
});

describe("blindIndex (HMAC-SHA256)", () => {
  it("deterministiktir: aynı girdi her zaman aynı hash", () => {
    expect(blindIndex("260000009")).toBe(blindIndex("260000009"));
    expect(blindIndex("260000009")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalize eder: trim + küçük harf", () => {
    expect(blindIndex("  Ahmet.Yilmaz@MKU.edu.tr ")).toBe(blindIndex("ahmet.yilmaz@mku.edu.tr"));
  });

  it("farklı girdiler farklı hash verir", () => {
    expect(blindIndex("260000009")).not.toBe(blindIndex("260000010"));
  });

  it("düz SHA-256 değildir (anahtarlıdır)", () => {
    expect(blindIndex("260000009")).not.toBe(sha256Hex("260000009"));
  });

  it("normalizeForIndex Unicode NFC uygular", () => {
    expect(normalizeForIndex("ç")).toBe(normalizeForIndex("ç"));
  });
});

describe("maskStudentNo / maskEmail", () => {
  it("ilk 2 ve son 2 hane açık", () => {
    expect(maskStudentNo("260000009")).toBe("26*****79");
    expect(maskStudentNo("123456")).toBe("12**56");
    expect(maskStudentNo(" 260000009 ")).toBe("26*****79");
  });

  it("4 haneden kısa değerleri tamamen maskeler", () => {
    expect(maskStudentNo("1234")).toBe("****");
    expect(maskStudentNo("12")).toBe("**");
    expect(maskStudentNo("")).toBe("");
  });

  it("öğrenci ve personel maillerini maskeler", () => {
    expect(maskEmail("260000009@ogr.mku.edu.tr")).toBe("26*****79@ogr.mku.edu.tr");
    expect(maskEmail("ahmet.yilmaz@mku.edu.tr")).toBe("ah***@mku.edu.tr");
    expect(maskEmail("a@mku.edu.tr")).toBe("***@mku.edu.tr");
  });
});

describe("token ve imza yardımcıları", () => {
  it("generateToken URL-güvenli ve yeterince uzun", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(token);
  });

  it("safeEqual sabit zamanlı eşitlik", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("sign / unsign: imzalı değer doğrulanır, değiştirilmiş değer reddedilir", () => {
    const signed = sign("state-123");
    expect(unsign(signed)).toBe("state-123");
    expect(unsign(signed.replace("state-123", "state-124"))).toBeNull();
    expect(unsign("imzasız")).toBeNull();
  });
});
