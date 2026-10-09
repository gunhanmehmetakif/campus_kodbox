import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuthPageConfig } from "@/server/auth/queries";

export const metadata: Metadata = { title: "Kayıt ol" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function RegisterContent({ searchParams }: { searchParams: SearchParams }) {
  const [params, config] = await Promise.all([searchParams, getAuthPageConfig()]);
  const oauth = Array.isArray(params.oauth) ? params.oauth[0] : params.oauth;
  return (
    <AuthCard
      title="Kayıt ol"
      description="Öğrenci numaranızı girin. Okul mailinize bir doğrulama linki göndereceğiz."
    >
      <RegisterForm turnstileSiteKey={config.turnstileSiteKey} oauthUnlinked={oauth === "unlinked"} />
    </AuthCard>
  );
}

export default function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
