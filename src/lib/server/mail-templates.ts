import "server-only";

/**
 * Kodbox mail şablonları (Türkçe, marka uyumlu, mail istemcisi uyumlu tablo düzeni).
 *
 * Mail istemcileri CSS değişkenlerini desteklemediği için renkler burada SABİT olarak
 * DESIGN.md'nin açık tema token'larından kopyalanmıştır (tek istisna; uygulamada hex yazılmaz).
 *
 * Her şablon { subject, html, text } döner → doğrudan sendMail({ to, ...template }).
 */

const C = {
  ink: "#13203A",
  inkSoft: "#4A5872",
  paper: "#F4F6F9",
  surface: "#FFFFFF",
  line: "#DDE2EA",
  laurel: "#1E6B57",
  laurelTint: "#E3F1EC",
  saffronTint: "#FBF0DC",
} as const;

const FONT = "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace";

export type MailContent = { subject: string; html: string; text: string };

/** Kime hitap: öğrenciye "sen", personele nötr dil (DESIGN.md · Metin kuralları). */
export type MailAudience = "student" | "staff";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type LayoutInput = {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  note?: string;
  footer: string;
};

function layout({ preheader, heading, paragraphs, cta, note, footer }: LayoutInput): string {
  const p = paragraphs
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink};">${para}</p>`,
    )
    .join("");

  const button = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border-radius:8px;background:${C.laurel};">
            <a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener"
               style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.inkSoft};">
        Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:
      </p>
      <p style="margin:0 0 20px;font-family:${MONO};font-size:12px;line-height:1.5;color:${C.laurel};word-break:break-all;">
        <a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener" style="color:${C.laurel};text-decoration:underline;">${escapeHtml(cta.href)}</a>
      </p>`
    : "";

  const noteBlock = note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;">
         <tr><td style="background:${C.saffronTint};border-radius:8px;padding:12px 14px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.ink};">${note}</td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 4px 16px;font-family:${DISPLAY};font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">
            <span style="color:${C.laurel};">k</span>odbox
          </td>
        </tr>
        <tr>
          <td style="background:${C.surface};border:1px solid ${C.line};border-radius:10px;padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(heading)}</h1>
            ${p}
            ${button}
            ${noteBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.inkSoft};">
            ${footer}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const AUTOMATED_FOOTER =
  "Bu mail Kodbox tarafından otomatik gönderildi. Yanıtlamana gerek yok. Kodbox sadece giriş ve hesap güvenliği için mail gönderir.";

/* ────────────────────────────── Kayıt doğrulama ────────────────────────────── */

export function verifyEmailTemplate(input: { link: string; expiresInHours?: number }): MailContent {
  const hours = input.expiresInHours ?? 24;
  const subject = "Kodbox: okul mailini doğrula";
  const html = layout({
    preheader: `Kaydını tamamlamak için ${hours} saat içinde mailini doğrula.`,
    heading: "Okul mailini doğrula",
    paragraphs: [
      "Kodbox'a kayıt olmak için okul mailini doğrulaman gerekiyor.",
      "Aşağıdaki butona tıkla, şifreni belirle ve hesabını etkinleştir.",
    ],
    cta: { label: "Mailimi doğrula", href: input.link },
    note: `Bu bağlantı <strong>${hours} saat</strong> geçerlidir ve <strong>tek kullanımlıktır</strong>.`,
    footer: `Kayıt isteğini sen yapmadıysan bu maili yok sayabilirsin; hesap oluşturulmaz.<br>${AUTOMATED_FOOTER}`,
  });
  const text = [
    "Okul mailini doğrula",
    "",
    "Kodbox'a kayıt olmak için okul mailini doğrulaman gerekiyor.",
    "Aşağıdaki bağlantıyı aç, şifreni belirle ve hesabını etkinleştir:",
    "",
    input.link,
    "",
    `Bağlantı ${hours} saat geçerlidir ve tek kullanımlıktır.`,
    "Kayıt isteğini sen yapmadıysan bu maili yok sayabilirsin; hesap oluşturulmaz.",
  ].join("\n");
  return { subject, html, text };
}

/* ────────────────────────────── Şifre sıfırlama ────────────────────────────── */

export function resetPasswordTemplate(input: {
  link: string;
  expiresInMinutes?: number;
  audience?: MailAudience;
}): MailContent {
  const minutes = input.expiresInMinutes ?? 60;
  const duration = minutes % 60 === 0 ? `${minutes / 60} saat` : `${minutes} dakika`;
  const staff = input.audience === "staff";
  const subject = "Kodbox: şifre sıfırlama bağlantısı";
  const html = layout({
    preheader: `Şifre sıfırlama bağlantısı ${duration} geçerlidir.`,
    heading: "Şifre sıfırlama",
    paragraphs: staff
      ? [
          "Kodbox hesabınız için bir şifre sıfırlama isteği alındı.",
          "Yeni şifre belirlemek için aşağıdaki butonu kullanın.",
        ]
      : ["Kodbox hesabın için bir şifre sıfırlama isteği aldık.", "Yeni şifreni belirlemek için aşağıdaki butona tıkla."],
    cta: { label: staff ? "Yeni şifre belirle" : "Yeni şifremi belirle", href: input.link },
    note: `Bağlantı <strong>${duration}</strong> geçerlidir ve <strong>tek kullanımlıktır</strong>. Şifre değişince tüm cihazlardaki oturumlar kapanır.`,
    footer: `${
      staff
        ? "Bu isteği siz yapmadıysanız maili yok sayabilirsiniz; şifreniz değişmez."
        : "Bu isteği sen yapmadıysan maili yok sayabilirsin; şifren değişmez."
    }<br>${AUTOMATED_FOOTER}`,
  });
  const text = [
    "Şifre sıfırlama",
    "",
    staff
      ? "Kodbox hesabınız için bir şifre sıfırlama isteği alındı. Yeni şifre belirlemek için bağlantıyı açın:"
      : "Kodbox hesabın için bir şifre sıfırlama isteği aldık. Yeni şifreni belirlemek için bağlantıyı aç:",
    "",
    input.link,
    "",
    `Bağlantı ${duration} geçerlidir ve tek kullanımlıktır.`,
    staff
      ? "Bu isteği siz yapmadıysanız maili yok sayabilirsiniz; şifreniz değişmez."
      : "Bu isteği sen yapmadıysan maili yok sayabilirsin; şifren değişmez.",
  ].join("\n");
  return { subject, html, text };
}

/* ─────────────────────────── "Zaten hesabın var" ─────────────────────────── */

/**
 * Kayıt formuna zaten kayıtlı bir numara girildiğinde gönderilir. Ekranda her zaman aynı
 * mesaj gösterildiği için (hesap varlığı sızdırılmaz) bilgi sadece mail sahibine ulaşır.
 */
export function accountExistsTemplate(input: { loginLink: string; resetLink: string }): MailContent {
  const subject = "Kodbox: zaten bir hesabın var";
  const html = layout({
    preheader: "Bu okul mailiyle açılmış bir Kodbox hesabı zaten var.",
    heading: "Zaten bir hesabın var",
    paragraphs: [
      "Biri (muhtemelen sen) bu okul mailiyle Kodbox'a yeniden kayıt olmayı denedi. Bu mail adresiyle açılmış bir hesap zaten var.",
      `Şifreni hatırlıyorsan <a href="${escapeHtml(input.loginLink)}" style="color:${C.laurel};">giriş yapabilirsin</a>. Hatırlamıyorsan aşağıdaki butonla şifreni sıfırla.`,
    ],
    cta: { label: "Şifremi sıfırla", href: input.resetLink },
    footer: `Bu isteği sen yapmadıysan bir şey yapmana gerek yok; hesabında değişiklik yapılmadı.<br>${AUTOMATED_FOOTER}`,
  });
  const text = [
    "Zaten bir hesabın var",
    "",
    "Biri (muhtemelen sen) bu okul mailiyle Kodbox'a yeniden kayıt olmayı denedi. Bu mail adresiyle açılmış bir hesap zaten var.",
    "",
    `Giriş yap: ${input.loginLink}`,
    `Şifreni sıfırla: ${input.resetLink}`,
    "",
    "Bu isteği sen yapmadıysan bir şey yapmana gerek yok; hesabında değişiklik yapılmadı.",
  ].join("\n");
  return { subject, html, text };
}
