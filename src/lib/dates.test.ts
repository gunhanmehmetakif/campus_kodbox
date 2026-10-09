import { describe, expect, it } from "vitest";

import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  formatDurationLong,
  formatRelative,
  formatTime,
  getZonedParts,
  parseDateTimeLocal,
  startOfZonedDay,
  toDateTimeLocalValue,
  zonedTimeToUtc,
} from "./dates";

// 12 Ekim 2026 23:59 İstanbul = 20:59 UTC (Türkiye sabit UTC+3)
const due = new Date("2026-10-12T20:59:00Z");

describe("İstanbul saat dilimi", () => {
  it("bileşenleri İstanbul'a göre verir", () => {
    expect(getZonedParts(due)).toEqual({ year: 2026, month: 10, day: 12, hour: 23, minute: 59, second: 0 });
    expect(getZonedParts(new Date("2026-10-12T21:30:00Z")).day).toBe(13);
  });

  it("duvar saatini UTC'ye çevirir", () => {
    expect(zonedTimeToUtc({ year: 2026, month: 10, day: 12, hour: 23, minute: 59 }).toISOString()).toBe(
      "2026-10-12T20:59:00.000Z",
    );
    expect(startOfZonedDay(due).toISOString()).toBe("2026-10-11T21:00:00.000Z");
  });
});

describe("biçimler (tr-TR)", () => {
  it("DESIGN.md biçimi: 12 Eki 2026, 23:59", () => {
    expect(formatDateTime(due)).toBe("12 Eki 2026, 23:59");
    expect(formatDate(due)).toBe("12 Eki 2026");
    expect(formatTime(due)).toBe("23:59");
  });

  it("kısa biçim aynı yılda yılı atlar", () => {
    expect(formatDateTimeShort(due, new Date("2026-01-01T12:00:00Z"))).toBe("12 Eki 23:59");
    expect(formatDateTimeShort(due, new Date("2025-12-01T12:00:00Z"))).toBe("12 Eki 2026, 23:59");
  });

  it("Türkçe ay adları", () => {
    expect(formatDate("2026-02-14T09:00:00Z")).toBe("14 Şub 2026");
    expect(formatDate("2026-08-01T09:00:00Z")).toBe("1 Ağu 2026");
  });
});

describe("göreli zaman", () => {
  const now = new Date("2026-10-09T09:00:00Z");
  it("dakika / saat / gün", () => {
    expect(formatRelative(new Date(now.getTime() - 20_000), now)).toBe("az önce");
    expect(formatRelative(new Date(now.getTime() - 5 * 60_000), now)).toBe("5 dakika önce");
    expect(formatRelative(new Date(now.getTime() + 2 * 3_600_000), now)).toBe("2 saat sonra");
    expect(formatRelative(new Date("2026-10-10T08:00:00Z"), now)).toBe("23 saat sonra");
    expect(formatRelative(new Date("2026-10-10T12:00:00Z"), now)).toBe("yarın");
    expect(formatRelative(new Date("2026-10-08T06:00:00Z"), now)).toBe("dün");
    expect(formatRelative(new Date("2026-10-12T08:00:00Z"), now)).toBe("3 gün sonra");
  });

  it("30 günden uzaksa mutlak tarih", () => {
    expect(formatRelative(new Date("2026-12-25T08:00:00Z"), now)).toBe("25 Ara 2026");
  });
});

describe("sayaç", () => {
  const min = 60_000;
  it("DESIGN.md biçimi: 2g 04s 13dk", () => {
    expect(formatCountdown(2 * 86_400_000 + 4 * 3_600_000 + 13 * min)).toBe("2g 04s 13dk");
    expect(formatCountdown(4 * 3_600_000 + 5 * min)).toBe("4s 05dk");
    expect(formatCountdown(13 * min + 5_000)).toBe("13dk 05sn");
    expect(formatCountdown(45_000)).toBe("45sn");
    expect(formatCountdown(-45_000)).toBe("45sn");
  });

  it("ekran okuyucu metni en büyük iki birim", () => {
    expect(formatDurationLong(2 * 86_400_000 + 4 * 3_600_000 + 13 * min)).toBe("2 gün 4 saat");
    expect(formatDurationLong(13 * min)).toBe("13 dakika");
    expect(formatDurationLong(3_600_000 + 30 * min)).toBe("1 saat 30 dakika");
    expect(formatDurationLong(20_000)).toBe("20 saniye");
  });
});

describe("datetime-local dönüşümleri", () => {
  it("İstanbul duvar saati ↔ UTC", () => {
    expect(toDateTimeLocalValue(due)).toBe("2026-10-12T23:59");
    expect(parseDateTimeLocal("2026-10-12T23:59")?.toISOString()).toBe(due.toISOString());
    expect(toDateTimeLocalValue(null)).toBe("");
  });

  it("geçersiz değerleri reddeder", () => {
    expect(parseDateTimeLocal("")).toBeNull();
    expect(parseDateTimeLocal("2026-02-31T10:00")).toBeNull();
    expect(parseDateTimeLocal("2026-13-01T10:00")).toBeNull();
    expect(parseDateTimeLocal("12.10.2026 23:59")).toBeNull();
  });
});
