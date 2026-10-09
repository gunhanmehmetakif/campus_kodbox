import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, loginUrl } from "@/lib/routes";
import {
  PATHNAME_HEADER,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

/**
 * Proxy (Next 16'da middleware'in yeni adı) — İYİMSER kontrol.
 *
 * 1. Korumalı rotalarda (/ogrenci, /egitmen, /admin, /sifre-degistir) oturum çerezi YOKSA
 *    DB'ye gitmeden /giris?next=… adresine yönlendirir.
 * 2. Çerez varsa ömrünü 30 güne uzatır (kayan oturum; DB tarafı session.ts'de).
 * 3. Sunucu bileşenlerinin "next" parametresi üretebilmesi için istek yolunu
 *    `x-kodbox-pathname` başlığıyla iletir.
 *
 * GERÇEK yetki kontrolü burada DEĞİL, her sayfa/action'da requireUser/requireRole ile yapılır.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(loginUrl(pathname + search), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname + search);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Kayan çerez: sadece sayfa gezinmelerinde (GET) yenile.
  if (token && request.method === "GET") {
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Statik dosyalar, görseller, favicon ve uzantılı dosyalar hariç her şey.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
