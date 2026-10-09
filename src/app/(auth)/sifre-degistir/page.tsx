import type { Metadata } from "next";
import { useId } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { PlaceholderForm } from "@/components/auth/placeholder-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Şifre değiştir" };

// Forced on first login for accounts created by an admin; action arrives in F1.
export default function ChangePasswordPage() {
  const currentId = useId();
  const nextId = useId();
  return (
    <AuthCard title="Şifrenizi değiştirin" description="Devam etmek için geçici şifrenizi değiştirmeniz gerekiyor.">
      <PlaceholderForm className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={currentId}>Geçici şifre</Label>
          <PasswordInput id={currentId} name="currentPassword" autoComplete="current-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={nextId}>Yeni şifre</Label>
          <PasswordInput id={nextId} name="newPassword" autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" className="h-11 w-full text-sm">
          Şifreyi değiştir
        </Button>
      </PlaceholderForm>
    </AuthCard>
  );
}
