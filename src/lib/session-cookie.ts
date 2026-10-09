/**
 * Oturum çerezi sabitleri. `server-only` DEĞİL, çünkü src/proxy.ts de kullanır.
 * Çerezin içinde sadece rastgele token vardır; kullanıcı bilgisi yoktur.
 */

const isProd = process.env.NODE_ENV === "production";

/**
 * Canlıda `__Host-` öneki: tarayıcı çerezi sadece Secure + Path=/ + Domain'siz kabul eder
 * (alt domain'lerden çerez enjeksiyonuna karşı). Yerelde http olduğu için öneksiz.
 */
export const SESSION_COOKIE_NAME = isProd ? "__Host-kodbox_session" : "kodbox_session";

/** Oturum ömrü: 30 gün (kayan). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Kalan süre bu eşiğin altına düşerse DB'deki bitiş 30 güne uzatılır. */
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 15;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

/** Proxy'nin sunucu bileşenlerine istek yolunu ilettiği başlık (bkz. src/proxy.ts). */
export const PATHNAME_HEADER = "x-kodbox-pathname";
