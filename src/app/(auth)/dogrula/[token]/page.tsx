import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { CompleteRegistrationForm } from "@/components/auth/password-forms";
import { TokenProblem } from "@/components/auth/token-problem";
import { getVerifyTokenState } from "@/server/auth/queries";

export const metadata: Metadata = { title: "Mail doğrulama", robots: { index: false } };

async function VerifyContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenState = await getVerifyTokenState(token);
  if (tokenState.status !== "valid") {
    return <TokenProblem status={tokenState.status} retryHref="/kayit" />;
  }
  return (
    <AuthCard title="Şifrenizi belirleyin" description="Hesabınız bu adımdan sonra aktif olur.">
      <CompleteRegistrationForm token={token} email={tokenState.email} />
    </AuthCard>
  );
}

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <VerifyContent params={params} />
    </Suspense>
  );
}
