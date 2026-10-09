import "server-only";

import { env } from "@/lib/env";

/**
 * Auth mail templates (docs/fazlar/F1-kimlik.md section 6): plain, inline-styled HTML plus a
 * plain text twin. Every mail carries the link, its lifetime and the "not you" note.
 */

export type AuthMail = { subject: string; html: string; text: string };

const IGNORE_NOTE = "Bu isteği siz yapmadıysanız dikkate almayın.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(input: { title: string; intro: string; cta: string; url: string; validity: string }): string {
  const appName = escapeHtml(env.NEXT_PUBLIC_APP_NAME);
  const url = escapeHtml(input.url);
  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <tr><td>
      <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#52606d;">${appName}</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${escapeHtml(input.title)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${escapeHtml(input.intro)}</p>
      <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#1f2933;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(input.cta)}</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#52606d;">Buton çalışmazsa bu adresi tarayıcınıza yapıştırın:<br><a href="${url}" style="color:#52606d;word-break:break-all;">${url}</a></p>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#52606d;">${escapeHtml(input.validity)} ${escapeHtml(IGNORE_NOTE)}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function plain(input: { intro: string; url: string; validity: string }): string {
  return [input.intro, "", input.url, "", `${input.validity} ${IGNORE_NOTE}`].join("\n");
}

export function verificationMail(url: string): AuthMail {
  const intro = "Hesabınızı oluşturmak için mail adresinizi doğrulayın ve şifrenizi belirleyin.";
  const validity = "Bu bağlantı 24 saat geçerlidir ve yalnızca bir kez kullanılabilir.";
  return {
    subject: `${env.NEXT_PUBLIC_APP_NAME} · Mail adresinizi doğrulayın`,
    html: layout({ title: "Mail adresinizi doğrulayın", intro, cta: "Doğrula ve şifre belirle", url, validity }),
    text: plain({ intro, url, validity }),
  };
}

export function existingAccountMail(resetUrl: string): AuthMail {
  const intro =
    "Bu mail adresiyle zaten bir hesabınız var. Şifrenizi unuttuysanız aşağıdaki bağlantıdan sıfırlayabilirsiniz.";
  const validity = "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.";
  return {
    subject: `${env.NEXT_PUBLIC_APP_NAME} · Zaten hesabınız var`,
    html: layout({ title: "Zaten hesabınız var", intro, cta: "Şifremi sıfırla", url: resetUrl, validity }),
    text: plain({ intro, url: resetUrl, validity }),
  };
}

export function passwordResetMail(url: string): AuthMail {
  const intro = "Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın.";
  const validity = "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.";
  return {
    subject: `${env.NEXT_PUBLIC_APP_NAME} · Şifre sıfırlama`,
    html: layout({ title: "Şifrenizi sıfırlayın", intro, cta: "Şifremi sıfırla", url, validity }),
    text: plain({ intro, url, validity }),
  };
}
