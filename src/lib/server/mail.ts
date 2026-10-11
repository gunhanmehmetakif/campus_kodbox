import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Mail sending. The system only sends verification and password reset mails (PRD 2.6);
 * everything else is an in-app notification.
 *
 * - With SMTP_HOST, SMTP_USER and SMTP_PASS: sends over SMTP (nodemailer, e.g. Gmail). Highest priority.
 * - Else with RESEND_API_KEY: sends through Resend.
 * - Else (local dev): nothing is sent; a summary is logged and the full HTML is written
 *   to `.dev-mail/` so you can open it in a browser and click the link.
 * - In production, no configured transport is an error.
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
let smtpTransport: Transporter | undefined;

export const DEV_MAIL_DIR = path.join(process.cwd(), ".dev-mail");

async function sendViaSmtp(
  input: SendMailInput,
  config: { host: string; user: string; pass: string },
): Promise<SendMailResult> {
  smtpTransport ??= nodemailer.createTransport({
    host: config.host,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: config.user, pass: config.pass },
  });
  try {
    const info = await smtpTransport.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, id: info.messageId ?? null };
  } catch (error) {
    // Log only message/code, never the transport config (credentials).
    const e = error as { message?: string; code?: string };
    console.error("[mail] SMTP error", { code: e.code, message: e.message });
    return { ok: false, error: "Mail gönderilemedi." };
  }
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return sendViaSmtp(input, { host: env.SMTP_HOST, user: env.SMTP_USER, pass: env.SMTP_PASS });
  }

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") {
      console.error("[mail] Neither SMTP nor RESEND_API_KEY is configured; cannot send mail in production.");
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
      "[mail:dev] Mail not sent (no SMTP or RESEND_API_KEY)",
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
