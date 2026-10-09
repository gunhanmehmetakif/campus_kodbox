import type { UserRole } from "@/db/schema";

/**
 * Application routes, single source. Pure module (client + server); `@/db/schema` is type-only.
 */
export const routes = {
  home: "/",
  login: "/giris",
  register: "/kayit",
  forgotPassword: "/sifremi-unuttum",
  verifyEmail: (token: string) => `/dogrula/${encodeURIComponent(token)}`,
  resetPassword: (token: string) => `/sifre-sifirla/${encodeURIComponent(token)}`,
  changePassword: "/sifre-degistir",
  account: "/hesap",
  notifications: "/bildirimler",
  student: { home: "/ogrenci" },
  instructor: { home: "/egitmen" },
  admin: { home: "/admin" },
} as const;

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

/** Prefixes that need a session (optimistic check in the proxy). */
export const PROTECTED_PREFIXES = [
  routes.student.home,
  routes.instructor.home,
  routes.admin.home,
  routes.account,
  routes.notifications,
  routes.changePassword,
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Validates a user supplied redirect target (open redirect protection): same-site paths only,
 * no `//` or `/\` prefix, no control characters.
 */
export function safeRedirectPath(next: string | null | undefined, fallback: string = routes.home): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

export function loginUrl(next?: string | null): string {
  const safe = next ? safeRedirectPath(next, "") : "";
  return safe && safe !== routes.home ? `${routes.login}?next=${encodeURIComponent(safe)}` : routes.login;
}
