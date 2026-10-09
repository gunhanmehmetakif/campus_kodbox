import type { Metadata } from "next";
import Link from "next/link";

import { AudienceEmailField } from "@/components/auth/audience-email-field";
import { AuthCard } from "@/components/auth/auth-card";
import { PlaceholderForm } from "@/components/auth/placeholder-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Kayıt ol"
      description="Öğrenci numaranızı girin. Okul mailinize bir doğrulama linki göndereceğiz."
    >
      <div className="space-y-4">
        <PlaceholderForm className="space-y-4">
          <AudienceEmailField lockAudience="student" />
          <Button type="submit" size="lg" className="h-11 w-full text-sm">
            Doğrulama linki gönder
          </Button>
        </PlaceholderForm>
        <Link
          href="/giris"
          className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline"
        >
          Zaten hesabım var
        </Link>
      </div>
    </AuthCard>
  );
}
