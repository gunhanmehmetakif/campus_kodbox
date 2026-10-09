import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { ThemePreference, UserRole, UserStatus } from "@/db/schema";
import { homePathForRole, loginUrl, routes } from "@/lib/routes";
import { PATHNAME_HEADER } from "@/lib/session-cookie";

import { decrypt, decryptNullable } from "./crypto";
import { validateSession } from "./session";

/**
 * Yetkilendirme yardımcıları — "Data Access Layer" girişi.
 *
 * HER sayfa, layout, Server Action ve Route Handler kendi yetkisini KENDİSİ kontrol eder.
 * Proxy (src/proxy.ts) sadece iyimser bir ön kontroldür; ona güvenilmez.
 *
 *   const user = await requireRole("instructor");   // sayfa veya action'ın ilk satırı
 *
 * Hepsi Request-time API okur → Cache Components altında <Suspense>/loading.tsx içinde çağrılır.
 */

export type CurrentUser = {
  id: string;
  sessionId: string;
  role: UserRole;
  schoolId: string;
  /** Çözülmüş okul maili. İstemciye geçirirken gerekirse maskeleyin (maskEmail). */
  email: string;
  /** Çözülmüş öğrenci numarası (sadece öğrenci). */
  studentNo: string | null;
  displayName: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  theme: ThemePreference;
};

/**
 * Oturumdaki kullanıcı ya da null. İstek başına tek DB sorgusu (React cache).
 * Sadece `active` kullanıcılar döner.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const result = await validateSession();
  if (!result || result.user.status !== "active") return null;
  const { user, session } = result;
  return {
    id: user.id,
    sessionId: session.id,
    role: user.role,
    schoolId: user.schoolId,
    email: decrypt(user.emailEnc),
    studentNo: decryptNullable(user.studentNoEnc),
    displayName: user.displayName,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    theme: user.theme,
  };
});

/** Proxy'nin eklediği başlıktan mevcut yol (+ query). Yoksa null. */
export async function getRequestPath(): Promise<string | null> {
  return (await headers()).get(PATHNAME_HEADER);
}

type RequireUserOptions = {
  /**
   * `must_change_password` olan kullanıcının bu sayfaya erişmesine izin ver.
   * Sadece /sifre-degistir ve çıkış işlemi için true yapılır.
   */
  allowPendingPasswordChange?: boolean;
};

/**
 * Oturum zorunlu. Yoksa `/giris?next=<mevcut yol>`'a yönlendirir.
 * Kullanıcının şifresini değiştirmesi gerekiyorsa `/sifre-degistir`'e zorlar.
 */
export async function requireUser(options: RequireUserOptions = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(await getRequestPath()));
  if (user.mustChangePassword && !options.allowPendingPasswordChange) redirect(routes.changePassword);
  return user;
}

/**
 * Belirli rol(ler) zorunlu. Farklı roldeki kullanıcı kendi paneline yönlendirilir.
 * @example const user = await requireRole("admin")
 * @example const user = await requireRole(["admin", "instructor"])
 */
export async function requireRole(role: UserRole | readonly UserRole[], options?: RequireUserOptions) {
  const user = await requireUser(options);
  const allowed = typeof role === "string" ? [role] : role;
  if (!allowed.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

/**
 * Misafir sayfaları (giriş, kayıt, şifremi unuttum) için: oturum açıksa panele gönderir.
 */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? routes.changePassword : homePathForRole(user.role));
}

/** Kullanıcı ilk girişte şifresini değiştirmek zorunda mı? (UI'da uyarı göstermek için) */
export function needsPasswordChange(user: Pick<CurrentUser, "mustChangePassword">): boolean {
  return user.mustChangePassword;
}

/** Görünen ad: personelde display_name, öğrencide maskesiz numara (kendi hesabı). */
export function userLabel(user: Pick<CurrentUser, "role" | "displayName" | "studentNo" | "email">): string {
  if (user.role === "student") return user.studentNo ?? user.email;
  return user.displayName ?? user.email;
}
