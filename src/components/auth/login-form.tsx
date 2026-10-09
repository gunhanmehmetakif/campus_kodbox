"use client";

import Link from "next/link";
import { useId } from "react";

import { AudienceEmailField } from "@/components/auth/audience-email-field";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { PlaceholderForm } from "@/components/auth/placeholder-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline";

/** Login screen body (PRD 2.1). Layout only: submit and Google handlers arrive in F1. */
export function LoginForm() {
  const passwordId = useId();
  const rememberId = useId();

  return (
    <div className="space-y-5">
      <PlaceholderForm className="space-y-4">
        <AudienceEmailField />
        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>Şifre</Label>
          <PasswordInput id={passwordId} name="password" autoComplete="current-password" />
        </div>
        <div className="flex min-h-11 items-center gap-2.5">
          <Checkbox id={rememberId} name="remember" defaultChecked />
          <Label htmlFor={rememberId} className="text-sm font-normal">
            Beni hatırla
          </Label>
        </div>
        <Button type="submit" size="lg" className="h-11 w-full text-sm">
          Giriş yap
        </Button>
      </PlaceholderForm>

      <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        veya
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Link href="/kayit" className={linkClass}>
          Kayıt ol
        </Link>
        <Link href="/sifremi-unuttum" className={linkClass}>
          Şifremi unuttum
        </Link>
      </div>
    </div>
  );
}
