import { describe, expect, it } from "vitest";

import {
  MKU_IDENTITY,
  buildEmail,
  detectKindFromDomain,
  domainForKind,
  emailDomain,
  isValidStaffLocalPart,
  isValidStudentNo,
  normalizeDomain,
  normalizeLocalPart,
  normalizeStudentNo,
  parseLoginInput,
  splitEmail,
  staffEmail,
  studentEmail,
} from "./identity";

const school = MKU_IDENTITY;

describe("normalizeLocalPart", () => {
  it("trim + küçük harf + @ sonrasını kırpar", () => {
    expect(normalizeLocalPart("  Ahmet.Yilmaz@mku.edu.tr ")).toBe("ahmet.yilmaz");
    expect(normalizeLocalPart("260000009")).toBe("260000009");
    expect(normalizeLocalPart("ahmet yilmaz")).toBe("ahmetyilmaz");
  });

  it("Türkçe İ küçültmesindeki birleşik noktayı temizler", () => {
    expect(normalizeLocalPart("İSMAİL")).toBe("ismail");
  });

  it("tam genişlikli rakamları ASCII'ye çevirir (NFKC)", () => {
    expect(normalizeLocalPart("２６１４０７２７９")).toBe("260000009");
  });
});

describe("splitEmail / domain", () => {
  it("yerel kısım ve domaini ayırır", () => {
    expect(splitEmail("260000009@OGR.mku.edu.tr")).toEqual({ local: "260000009", domain: "ogr.mku.edu.tr" });
    expect(splitEmail("ahmet.yilmaz")).toEqual({ local: "ahmet.yilmaz", domain: null });
    expect(emailDomain("x@mku.edu.tr")).toBe("mku.edu.tr");
    expect(normalizeDomain(" @MKU.edu.tr")).toBe("mku.edu.tr");
  });
});

describe("detectKindFromDomain / parseLoginInput", () => {
  it("okulun domainlerini tanır", () => {
    expect(detectKindFromDomain("ogr.mku.edu.tr", school)).toBe("student");
    expect(detectKindFromDomain("MKU.EDU.TR", school)).toBe("staff");
    expect(detectKindFromDomain("gmail.com", school)).toBeNull();
  });

  it("yapıştırılan tam maili kırpar ve sekmeyi önerir", () => {
    expect(parseLoginInput("ahmet.yilmaz@mku.edu.tr", school)).toEqual({
      local: "ahmet.yilmaz",
      detectedKind: "staff",
      foreignDomain: null,
    });
    expect(parseLoginInput("260000009@ogr.mku.edu.tr", school)).toEqual({
      local: "260000009",
      detectedKind: "student",
      foreignDomain: null,
    });
  });

  it("okula ait olmayan domaini bildirir", () => {
    expect(parseLoginInput("ali@gmail.com", school)).toEqual({ local: "ali", detectedKind: null, foreignDomain: "gmail.com" });
  });

  it("domain yoksa sadece normalize eder", () => {
    expect(parseLoginInput(" 260000009 ", school)).toEqual({ local: "260000009", detectedKind: null, foreignDomain: null });
  });
});

describe("mail kurma", () => {
  it("öğrenci maili numaradan türetilir", () => {
    expect(studentEmail("260000009", school)).toBe("260000009@ogr.mku.edu.tr");
    expect(studentEmail(" 2614 07279 ", school)).toBe("260000009@ogr.mku.edu.tr");
  });

  it("personel maili", () => {
    expect(staffEmail("Ahmet.Yilmaz", school)).toBe("ahmet.yilmaz@mku.edu.tr");
    expect(buildEmail("x", "@MKU.edu.tr")).toBe("x@mku.edu.tr");
    expect(domainForKind("student", school)).toBe("ogr.mku.edu.tr");
    expect(domainForKind("staff", school)).toBe("mku.edu.tr");
  });
});

describe("doğrulama", () => {
  it("öğrenci numarası okulun regex'ine göre", () => {
    expect(isValidStudentNo("260000009", school)).toBe(true);
    expect(isValidStudentNo("123456", school)).toBe(true);
    expect(isValidStudentNo("12345", school)).toBe(false);
    expect(isValidStudentNo("1234567890123", school)).toBe(false);
    expect(isValidStudentNo("26000000a", school)).toBe(false);
    expect(normalizeStudentNo("261 407 279")).toBe("260000009");
  });

  it("bozuk regex'te false döner (hata fırlatmaz)", () => {
    expect(isValidStudentNo("123456", { studentNoRegex: "([" })).toBe(false);
  });

  it("personel yerel kısmı", () => {
    expect(isValidStaffLocalPart("ahmet.yilmaz")).toBe(true);
    expect(isValidStaffLocalPart("a")).toBe(true);
    expect(isValidStaffLocalPart(".ahmet")).toBe(false);
    expect(isValidStaffLocalPart("ahmet.")).toBe(false);
    expect(isValidStaffLocalPart("ahmet..yilmaz")).toBe(false);
    expect(isValidStaffLocalPart("ahmet/yilmaz")).toBe(false);
    expect(isValidStaffLocalPart("a".repeat(65))).toBe(false);
  });
});
