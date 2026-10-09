import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resend } from "resend";

import { env } from "@/lib/env";

export {
  accountExistsTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
  type MailAudience,
  type MailContent,
} from "./mail-templates";

/**
 * Mail gönderimi (PLAN.md §2.5: sistem SADECE kimlik doğrulama maili gönderir).
 *
 * - RESEND_API_KEY varsa Resend ile gönderir.
 * - Yoksa (yerel geliştirme) mail gönderilmez: konsola özet yazılır ve tam HTML
 *   `.dev-mail/` klasörüne kaydedilir (tarayıcıda açıp linke tıklayabilirsiniz).
 * - Canlıda (NODE_ENV=production) anahtar yoksa hata fırlatır.
 *
 * @example
 *   await sendMail({ to: email, ...verifyEmailTemplate({ link }) });
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
      console.error("[mail] RESEND_API_KEY tanımlı değil; canlıda mail gönderilemez.");
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
      console.error("[mail] Resend hatası", { name: error.name, message: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[mail] gönderim başarısız", error);
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
    console.warn("[mail:dev] .dev-mail klasörüne yazılamadı", error);
  }
  console.info(
    [
      "",
      "┌─ [mail:dev] Mail gönderilmedi (RESEND_API_KEY yok) ─────────────────",
      `│ Kime : ${input.to}`,
      `│ Konu : ${input.subject}`,
      `│ Dosya: ${path.relative(process.cwd(), file)}`,
      "├─────────────────────────────────────────────────────────────────────",
      ...input.text.split("\n").map((line) => `│ ${line}`),
      "└─────────────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
  return { ok: true, id: null };
}

/** APP_URL'e göre mutlak link üretir (mail içindeki bağlantılar için). */
export function absoluteUrl(pathname: string): string {
  return `${env.APP_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
