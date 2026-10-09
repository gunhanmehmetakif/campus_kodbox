import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/routes";
import { getAuthPageConfig } from "@/server/auth/queries";

export const metadata: Metadata = { title: "Giriş" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const [params, config] = await Promise.all([searchParams, getAuthPageConfig()]);
  const next = safeRedirectPath(first(params.next), "");
  return (
    <AuthCard title="Giriş yap" description="Okul mailinizle devam edin.">
      <LoginForm
        googleEnabled={config.googleEnabled}
        turnstileSiteKey={config.turnstileSiteKey}
        next={next}
        oauthError={first(params.oauth) === "error"}
      />
    </AuthCard>
  );
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
