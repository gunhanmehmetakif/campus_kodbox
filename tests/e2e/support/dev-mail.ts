import fs from "node:fs/promises";
import path from "node:path";

import { ROOT } from "./env";

/** Same folder `src/lib/server/mail.ts` writes to when RESEND_API_KEY is empty. */
const DEV_MAIL_DIR = path.join(ROOT, ".dev-mail");

type Query = { to: string; linkPath: string; since: number; timeoutMs?: number };

/**
 * Polls `.dev-mail/` for the newest mail addressed to `to` (header comment
 * `<!-- To: ... -->`) written after `since` and returns the first link containing `linkPath`.
 */
export async function waitForMailLink({ to, linkPath, since, timeoutMs = 30_000 }: Query): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const wanted = to.toLowerCase();
  while (Date.now() < deadline) {
    const link = await findLink(wanted, linkPath, since);
    if (link) return link;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No mail to ${to} with a "${linkPath}" link appeared in .dev-mail within ${timeoutMs} ms.`);
}

async function findLink(to: string, linkPath: string, since: number): Promise<string | null> {
  let names: string[];
  try {
    names = (await fs.readdir(DEV_MAIL_DIR)).filter((n) => n.endsWith(".html")).sort().reverse();
  } catch {
    return null;
  }
  const escaped = linkPath.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const linkPattern = new RegExp(`https?://[^"'\\s<]*${escaped}[^"'\\s<]*`);
  for (const name of names) {
    const file = path.join(DEV_MAIL_DIR, name);
    const stat = await fs.stat(file);
    if (stat.mtimeMs < since) break;
    const content = await fs.readFile(file, "utf8");
    const header = /<!--\s*To:\s*(\S+)/.exec(content);
    if (header?.[1]?.toLowerCase() !== to) continue;
    const link = linkPattern.exec(content);
    if (link) return link[0].replace(/&amp;/g, "&");
  }
  return null;
}
