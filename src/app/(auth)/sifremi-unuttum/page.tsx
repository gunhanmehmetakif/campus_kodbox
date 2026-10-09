import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { FormMessage } from "@/components/form-field";
import { redirectIfSignedIn } from "@/lib/server/auth";
import { getDefaultSchool, toSchoolIdentity } from "@/lib/server/schools";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

import { AuthFormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Şifremi unuttum" };

/** Şifre sıfırlama isteği (PLAN.md §2.3). */
export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeader title="Şifremi unuttum" description="Okul mailine tek kullanımlık bir sıfırlama linki gönderelim." />
      <Suspense fallback={<AuthFormSkeleton fields={1} />}>
        <ForgotPasswordContent />
      </Suspense>
    </>
  );
}

async function ForgotPasswordContent() {
  await redirectIfSignedIn();
  const school = await getDefaultSchool();
  if (!school) return <FormMessage>Sistemde tanımlı okul yok.</FormMessage>;
  return <ForgotPasswordForm school={toSchoolIdentity(school)} turnstileSiteKey={getTurnstileSiteKey()} />;
}
