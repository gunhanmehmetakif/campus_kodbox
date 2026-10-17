import "server-only";

import { COMMON_PASSWORDS } from "./common-passwords-list";

/**
 * Common password check (server-side only; the list is never shipped to the client).
 * Runs after the regular policy, so it only needs to catch passwords the policy allows.
 */

const TURKISH_WORDS = [
  "mku",
  "ogrenci",
  "sifre",
  "parola",
  "kodbox",
  "campus",
  "kampus",
  "galatasaray",
  "fenerbahce",
  "besiktas",
  "trabzon",
  "istanbul",
  "ankara",
  "hatay",
  "antakya",
  "turkiye",
  "qwerty",
  "asdf",
  "password",
  "sevgilim",
];

const WORD_WITH_DIGITS = new RegExp(`^(?:${TURKISH_WORDS.join("|")})\\d+$`);

const TURKISH_FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };

function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[ışğüöç]/g, (c) => TURKISH_FOLD[c] ?? c)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

/** Mostly one repeated char, or (almost) only consecutive-code-point steps like "abcd1234". */
function isTrivialPattern(value: string): boolean {
  const chars = [...value];
  if (chars.length < 2) return true;

  const counts = new Map<string, number>();
  for (const c of chars) counts.set(c, (counts.get(c) ?? 0) + 1);
  if (counts.size <= 2) return true;
  if (Math.max(...counts.values()) / chars.length >= 0.7) return true;

  let stepped = 0;
  for (let i = 1; i < chars.length; i++) {
    if (Math.abs(chars[i]!.codePointAt(0)! - chars[i - 1]!.codePointAt(0)!) === 1) stepped += 1;
  }
  return stepped / (chars.length - 1) >= 0.75;
}

export function isCommonPassword(pw: string): boolean {
  const folded = fold(pw);
  return COMMON_PASSWORDS.has(folded) || WORD_WITH_DIGITS.test(folded) || isTrivialPattern(folded);
}
