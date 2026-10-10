import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { ROOT } from "./env";

/** Git-ignored folder: generated passwords and ids shared by the sequential flows never enter the repo. */
export const AUTH_DIR = path.join(ROOT, "tests", "e2e", ".auth");
const STATE_FILE = path.join(AUTH_DIR, "state.json");

export type Account = { local: string; email: string; password: string };
export type StudentAccount = Account & { no: string };

export type E2eState = {
  admin: Account;
  instructor?: Account;
  /** Registered students (flow 1). */
  students?: StudentAccount[];
  /** Student number added to the roster without ever registering (flow 2). */
  unregisteredNo?: string;
  courseId?: string;
  assignmentId?: string;
  /** Score given per student number (flow 5). */
  scores?: Record<string, number>;
};

export function loadState(): E2eState {
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as E2eState;
}

export function saveState(patch: Partial<E2eState>): E2eState {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const current = fs.existsSync(STATE_FILE) ? loadState() : ({} as E2eState);
  const next = { ...current, ...patch };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

/** Meets the password policy (letter + digit, 8+ chars). */
export function randomPassword(): string {
  return `Aa1-${randomBytes(9).toString("base64url")}`;
}

/** Random 10 digit student number (matches the school's number pattern). */
export function randomStudentNo(): string {
  return `26${String(10_000_000 + (randomBytes(4).readUInt32BE() % 90_000_000))}`;
}
