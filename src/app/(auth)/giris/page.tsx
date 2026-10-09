import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { FormMessage } from "@/components/form-field";
import { isAppleLoginEnabled, isGoogleLoginEnabled } from "@/lib/env";
import { safeRedirectPath } from "@/lib/routes";
import { redirectIfSignedIn } from "@/lib/server/auth";
import { getDefaultSchool, toSchoolIdentity } from "@/lib/server/schools";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

import { AuthFormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Giriş" };

/** Giriş ekranı (PLAN.md §2.1). F0: görsel iskelet; F1 LoginForm'a `action` bağlar. */
export default function LoginPage({ searchParams }: PageProps<"/giris">) {
  return (
    <>
      <AuthHeader title="Giriş yap" description="Okul mailin ve şifrenle giriş yap." />
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/giris">["searchParams"] }) {
  await redirectIfSignedIn();
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next, "") : "";
  const school = await getDefaultSchool();
  if (!school) {
    return <FormMessage>Sistemde tanımlı okul yok. Kurulum tamamlanmamış: `npm run db:seed` çalıştırın.</FormMessage>;
  }
  return (
    <LoginForm
      school={toSchoolIdentity(school)}
      turnstileSiteKey={getTurnstileSiteKey()}
      googleEnabled={isGoogleLoginEnabled()}
      appleEnabled={isAppleLoginEnabled()}
      next={next || undefined}
    />
  );
}
