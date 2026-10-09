import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Mail sending. The system only sends verification and password reset mails (PRD 2.6);
 * everything else is an in-app notification.
 *
 * - With RESEND_API_KEY: sends through Resend.
 * - Without it (local dev): nothing is sent; a summary is logged and the full HTML is written
 *   to `.dev-mail/` so you can open it in a browser and click the link.
 * - In production a missing key is an error.
 *
 * Mail templates are added in F1 (verify / reset).
 *
 * @example await sendMail({ to: email, subject, html, text })
 */

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = { ok: true; id: string | null } | { ok: false; error: string };

let resendClient: Resend | undefined;

export const DEV_MAIL_DIR = path.join(process.cwd(), ".dev-mail");

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") {
      console.error("[mail] RESEND_API_KEY is not set; cannot send mail in production.");
      return { ok: false, error: "Mail servisi yapılandırılmamış." };
    }
    return writeDevMail(input);
  }

  resendClient ??= new Resend(env.RESEND_API_KEY);
  try {
    const { data, error } = await resendClient.emails.send({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("[mail] Resend error", { name: error.name, message: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[mail] send failed", error);
    return { ok: false, error: "Mail gönderilemedi." };
  }
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function writeDevMail(input: SendMailInput): Promise<SendMailResult> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(DEV_MAIL_DIR, `${stamp}-${slugify(input.subject)}.html`);
  const header = `<!-- To: ${input.to}\n     Subject: ${input.subject}\n     Date: ${new Date().toISOString()} -->\n`;
  try {
    await mkdir(DEV_MAIL_DIR, { recursive: true });
    await writeFile(file, header + input.html, "utf8");
  } catch (error) {
    console.warn("[mail:dev] could not write to .dev-mail", error);
  }
  console.info(
    [
      "",
      "[mail:dev] Mail not sent (no RESEND_API_KEY)",
      `  To     : ${input.to}`,
      `  Subject: ${input.subject}`,
      `  File   : ${path.relative(process.cwd(), file)}`,
      ...input.text.split("\n").map((line) => `  | ${line}`),
      "",
    ].join("\n"),
  );
  return { ok: true, id: null };
}

/** Absolute URL from APP_URL (for links inside mails). */
export function absoluteUrl(pathname: string): string {
  return `${env.APP_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
