import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { SetPasswordForm } from "@/components/auth/set-password-form";

import { AuthFormSkeleton } from "../../form-skeleton";

export const metadata: Metadata = { title: "Hesabını etkinleştir" };

/**
 * Kayıt doğrulama linki (PLAN.md §2.2 adım 4): şifre belirleme + KVKK onayı.
 * F1: token'ı doğrular (geçersiz/süresi dolmuşsa açıklayıcı ekran), SetPasswordForm'a action bağlar.
 */
export default function VerifyEmailPage({ params }: PageProps<"/dogrula/[token]">) {
  return (
    <>
      <AuthHeader title="Şifreni belirle" description="Okul mailin doğrulandı. Hesabını etkinleştirmek için bir şifre belirle." />
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <VerifyContent params={params} />
      </Suspense>
    </>
  );
}

async function VerifyContent({ params }: { params: PageProps<"/dogrula/[token]">["params"] }) {
  const { token } = await params;
  return <SetPasswordForm mode="verify" token={token} />;
}
