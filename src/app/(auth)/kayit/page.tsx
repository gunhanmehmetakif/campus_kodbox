import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectIfSignedIn } from "@/lib/server/auth";
import { listSchools, toSchoolIdentity } from "@/lib/server/schools";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

import { AuthFormSkeleton } from "../form-skeleton";

export const metadata: Metadata = { title: "Kayıt ol" };

/** Öğrenci kaydı (PLAN.md §2.2). Eğitmenler kayıt olamaz; hesaplarını admin açar. */
export default function RegisterPage() {
  return (
    <>
      <AuthHeader
        title="Öğrenci kaydı"
        description="Okul numaranı gir; okul mailine gelen linkle şifreni belirle. Eğitmen hesaplarını yönetici açar."
      />
      <Suspense fallback={<AuthFormSkeleton />}>
        <RegisterContent />
      </Suspense>
    </>
  );
}

async function RegisterContent() {
  await redirectIfSignedIn();
  const schools = await listSchools();
  return (
    <RegisterForm
      schools={schools.map((s) => ({ id: s.id, name: s.name, identity: toSchoolIdentity(s) }))}
      turnstileSiteKey={getTurnstileSiteKey()}
    />
  );
}
