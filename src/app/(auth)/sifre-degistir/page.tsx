import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { FormMessage } from "@/components/form-field";
import { homePathForRole } from "@/lib/routes";
import { requireUser } from "@/lib/server/auth";

import { AuthFormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Şifre değiştir" };

/**
 * Şifre değiştirme. `must_change_password` olan kullanıcı (admin'in verdiği geçici şifre)
 * requireUser tarafından buraya zorlanır; şifresini değiştirmeden başka sayfaya geçemez.
 */
export default function ChangePasswordPage() {
  return (
    <>
      <AuthHeader title="Şifre değiştir" description="Mevcut şifreni ve yeni şifreni gir." />
      <Suspense fallback={<AuthFormSkeleton fields={3} />}>
        <ChangePasswordContent />
      </Suspense>
    </>
  );
}

async function ChangePasswordContent() {
  const user = await requireUser({ allowPendingPasswordChange: true });
  return (
    <div className="flex flex-col gap-4">
      {user.mustChangePassword ? (
        <FormMessage tone="info">Hesabınız geçici bir şifreyle açıldı. Devam etmek için yeni bir şifre belirleyin.</FormMessage>
      ) : null}
      <SetPasswordForm mode="change" />
      {!user.mustChangePassword ? (
        <p className="text-center text-sm text-ink-soft">
          <Link href={homePathForRole(user.role)} className="font-medium text-laurel hover:underline">
            Panele dön
          </Link>
        </p>
      ) : null}
    </div>
  );
}
