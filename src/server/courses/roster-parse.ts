import { isValidStudentNo, normalizeStudentNo } from "@/lib/identity";

/**
 * Roster text parser (docs/fazlar/F2-F3-admin-ders.md section 3). Pure module: runs on the
 * client for the live preview and on the server for the real import. Never import server-only
 * code here.
 */

export type ParsedRosterLine = { studentNo: string; displayName: string | null };

export const ROSTER_MAX_NUMBERS = 1000;
export const ROSTER_NAME_MAX_LENGTH = 120;

const SEPARATORS = /[\s,;]+/;
const LEADING_SEPARATORS = /^[\s,;]+/;

export function parseRosterText(
  text: string,
  studentNoRegex: string,
): { valid: ParsedRosterLine[]; invalid: string[] } {
  const found = new Map<string, string | null>();
  const invalid: string[] = [];
  let processed = 0;

  const isNumber = (token: string) => isValidStudentNo(token, { studentNoRegex });
  const looksLikeNumber = (token: string) => /^\d+$/.test(normalizeStudentNo(token)) || isNumber(token);
  const accept = (token: string, name: string | null) => {
    const studentNo = normalizeStudentNo(token);
    const previous = found.get(studentNo);
    // The last name wins, but a later duplicate without a name does not erase an earlier one.
    found.set(studentNo, name ?? previous ?? null);
  };

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    if (processed >= ROSTER_MAX_NUMBERS) break;
    const line = rawLine.trim();
    if (!line) continue;

    const tokens = line.split(SEPARATORS).filter(Boolean);
    if (tokens.length > 1 && tokens.every(looksLikeNumber)) {
      for (const token of tokens) {
        if (processed >= ROSTER_MAX_NUMBERS) break;
        processed++;
        if (isNumber(token)) accept(token, null);
        else invalid.push(token);
      }
      continue;
    }

    processed++;
    const first = tokens[0]!;
    if (!isNumber(first)) {
      invalid.push(tokens.length === 1 ? first : line);
      continue;
    }
    const rest = line.slice(line.indexOf(first) + first.length).replace(LEADING_SEPARATORS, "");
    const name = rest.replace(/\s+/g, " ").trim().slice(0, ROSTER_NAME_MAX_LENGTH).trim();
    accept(first, name || null);
  }

  return {
    valid: [...found].map(([studentNo, displayName]) => ({ studentNo, displayName })),
    invalid,
  };
}
