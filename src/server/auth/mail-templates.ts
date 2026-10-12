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
  const logoUrl = escapeHtml(`${env.APP_URL}/icons/mail-logo.png`);
  const title = escapeHtml(input.title);
  const intro = escapeHtml(input.intro);
  const sans = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const serif = "Georgia,'Times New Roman',serif";
  const mono = "'SFMono-Regular',Menlo,Consolas,monospace";
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#faf8f3;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;margin:0 auto;">
        <tr><td style="padding:0 0 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;padding:0 12px 0 0;"><img src="${logoUrl}" width="40" height="40" alt="" style="display:block;border:0;border-radius:9px"></td>
            <td style="vertical-align:middle;"><span style="font-family:${serif};font-size:24px;font-weight:600;color:#1f2433;letter-spacing:-0.02em;">kodbox</span> <span style="font-family:${mono};font-size:11px;letter-spacing:0.18em;color:#5a5f73;">CAMPUS</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e6e1d6;border-top:4px solid #e3a948;border-radius:16px;padding:36px 32px;">
          <h1 style="margin:0 0 14px;font-family:${serif};font-size:26px;line-height:1.25;font-weight:600;color:#1f2433;">${title}</h1>
          <p style="margin:0 0 28px;font-family:${sans};font-size:16px;line-height:1.6;color:#3d4256;">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>
            <td bgcolor="#2b3a67" style="background:#2b3a67;border-radius:10px;"><a href="${url}" style="display:inline-block;padding:14px 24px;font-family:${sans};font-size:16px;line-height:20px;font-weight:600;color:#faf8f3;text-decoration:none;border-radius:10px;">${escapeHtml(input.cta)}</a></td>
          </tr></table>
          <div style="border-top:1px solid #eee9de;padding-top:20px;">
            <p style="margin:0 0 12px;font-family:${sans};font-size:13px;line-height:1.6;color:#5a5f73;">Buton çalışmazsa bu adresi tarayıcınıza yapıştırın:<br><a href="${url}" style="color:#5a5f73;word-break:break-all;">${url}</a></p>
            <p style="margin:0;font-family:${sans};font-size:13px;line-height:1.6;color:#5a5f73;">${escapeHtml(input.validity)} ${escapeHtml(IGNORE_NOTE)}</p>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:20px 0 0;font-family:${sans};font-size:12px;line-height:1.5;color:#7a7f90;">${appName} · Bu mail otomatik gönderildi, yanıtlamanıza gerek yok.</td></tr>
      </table>
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
