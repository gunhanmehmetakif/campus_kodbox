import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { SetPasswordForm } from "@/components/auth/set-password-form";

import { AuthFormSkeleton } from "../../form-skeleton";

export const metadata: Metadata = { title: "Yeni şifre" };

/** Şifre sıfırlama linki (PLAN.md §2.3). F1 token doğrulamasını ve action'ı bağlar. */
export default function ResetPasswordPage({ params }: PageProps<"/sifre-sifirla/[token]">) {
  return (
    <>
      <AuthHeader title="Yeni şifre belirle" description="Şifren değişince tüm cihazlardaki oturumlar kapanır." />
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <ResetContent params={params} />
      </Suspense>
    </>
  );
}

async function ResetContent({ params }: { params: PageProps<"/sifre-sifirla/[token]">["params"] }) {
  const { token } = await params;
  return <SetPasswordForm mode="reset" token={token} />;
}
