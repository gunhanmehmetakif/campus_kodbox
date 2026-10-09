import type { UserRole } from "@/db/schema";

/**
 * Uygulama rotaları — tek kaynak. Link/redirect yazarken string yerine bunları kullanın.
 * (Saf modül; istemci ve sunucuda kullanılabilir. `@/db/schema` sadece tip olarak içe alınır.)
 */
export const routes = {
  home: "/",
  login: "/giris",
  register: "/kayit",
  forgotPassword: "/sifremi-unuttum",
  verifyEmail: (token: string) => `/dogrula/${encodeURIComponent(token)}`,
  resetPassword: (token: string) => `/sifre-sifirla/${encodeURIComponent(token)}`,
  changePassword: "/sifre-degistir",

  student: {
    home: "/ogrenci",
  },
  instructor: {
    home: "/egitmen",
  },
  admin: {
    home: "/admin",
  },

  designGuide: "/_tasarim",
} as const;

/** Rolün ana paneli. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return routes.admin.home;
    case "instructor":
      return routes.instructor.home;
    case "student":
      return routes.student.home;
  }
}

/** Oturum gerektiren rota önekleri (proxy'nin iyimser kontrolü için). */
export const PROTECTED_PREFIXES = [
  routes.student.home,
  routes.instructor.home,
  routes.admin.home,
  routes.changePassword,
] as const;

/** Oturum açıkken anlamsız olan (giriş yapılmışsa panele yönlendirilen) rotalar. */
export const GUEST_ONLY_PREFIXES = [routes.login, routes.register, routes.forgotPassword] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * `?next=` gibi kullanıcıdan gelen yönlendirme hedefini doğrular (open redirect'e karşı).
 * Sadece aynı site içi, `/` ile başlayan ve `//` veya `/\` ile başlamayan yollar kabul edilir.
 */
export function safeRedirectPath(next: string | null | undefined, fallback: string = routes.home): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

/** Giriş sayfası URL'i (dönüş adresiyle). */
export function loginUrl(next?: string | null): string {
  const safe = next ? safeRedirectPath(next, "") : "";
  return safe && safe !== routes.home ? `${routes.login}?next=${encodeURIComponent(safe)}` : routes.login;
}
