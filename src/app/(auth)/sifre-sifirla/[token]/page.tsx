import type { Metadata } from "next";
import { useId } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { PlaceholderForm } from "@/components/auth/placeholder-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Şifre sıfırla" };

// Token validation and the reset action are wired in F1.
export default function ResetPasswordPage() {
  const passwordId = useId();
  return (
    <AuthCard title="Yeni şifre belirleyin" description="Sıfırlama linki tek kullanımlıktır.">
      <PlaceholderForm className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>Yeni şifre</Label>
          <PasswordInput id={passwordId} name="password" autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" className="h-11 w-full text-sm">
          Şifreyi kaydet
        </Button>
      </PlaceholderForm>
    </AuthCard>
  );
}
