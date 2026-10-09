import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { TokenProblem } from "@/components/auth/token-problem";
import { getResetTokenState } from "@/server/auth/queries";

export const metadata: Metadata = { title: "Şifre sıfırla", robots: { index: false } };

async function ResetContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenState = await getResetTokenState(token);
  if (tokenState.status !== "valid") {
    return <TokenProblem status={tokenState.status} retryHref="/sifremi-unuttum" />;
  }
  return (
    <AuthCard title="Yeni şifre belirleyin" description="Sıfırlama linki tek kullanımlıktır.">
      <ResetPasswordForm token={token} email={tokenState.email} />
    </AuthCard>
  );
}

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetContent params={params} />
    </Suspense>
  );
}
