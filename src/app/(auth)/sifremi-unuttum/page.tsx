import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuthPageConfig } from "@/server/auth/queries";

export const metadata: Metadata = { title: "Şifremi unuttum" };

async function ForgotContent() {
  const config = await getAuthPageConfig();
  return (
    <AuthCard title="Şifremi unuttum" description="Okul mailinize bir sıfırlama linki göndereceğiz.">
      <ForgotPasswordForm turnstileSiteKey={config.turnstileSiteKey} />
    </AuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ForgotContent />
    </Suspense>
  );
}
