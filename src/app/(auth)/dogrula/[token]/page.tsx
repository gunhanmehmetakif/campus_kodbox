import type { Metadata } from "next";
import { useId } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { PlaceholderForm } from "@/components/auth/placeholder-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Mail doğrulama" };

// Token validation and password creation are wired in F1.
export default function VerifyEmailPage() {
  const passwordId = useId();
  const kvkkId = useId();
  return (
    <AuthCard title="Şifrenizi belirleyin" description="Hesabınız bu adımdan sonra aktif olur.">
      <PlaceholderForm className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>Yeni şifre</Label>
          <PasswordInput id={passwordId} name="password" autoComplete="new-password" />
        </div>
        <div className="flex items-start gap-2.5 py-1.5">
          <Checkbox id={kvkkId} name="kvkk" className="mt-0.5" />
          <Label htmlFor={kvkkId} className="text-sm leading-snug font-normal">
            KVKK aydınlatma metnini okudum, onaylıyorum.
          </Label>
        </div>
        <Button type="submit" size="lg" className="h-11 w-full text-sm">
          Hesabı etkinleştir
        </Button>
      </PlaceholderForm>
    </AuthCard>
  );
}
