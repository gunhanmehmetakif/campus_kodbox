"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef } from "react";

import { AudienceEmailField } from "@/components/auth/audience-email-field";
import { FormError, SubmitButton, fieldMessages, formError, useFocusOnError } from "@/components/auth/form-parts";
import { Turnstile } from "@/components/auth/turnstile";
import { forgotPasswordAction } from "@/server/auth/actions";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline";

export function ForgotPasswordForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [state, formAction] = useActionState(forgotPasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 className="font-heading text-lg font-medium">Mailinizi kontrol edin</h2>
          <p className="text-sm text-muted-foreground" role="status">
            Bilgileriniz doğruysa okul mailinize bir sıfırlama linki gönderdik. Link 1 saat geçerlidir.
          </p>
        </div>
        <div className="flex justify-center">
          <Link href="/giris" className={linkClass}>
            Girişe dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        <FormError message={formError(state)} />
        <AudienceEmailField storageKey="kodbox:login-audience" errors={fieldMessages(state, "local")} />
        <Turnstile siteKey={turnstileSiteKey} resetSignal={state} />
        <SubmitButton pendingLabel="Gönderiliyor…">Sıfırlama linki gönder</SubmitButton>
      </form>
      <Link href="/giris" className={linkClass}>
        Girişe dön
      </Link>
    </div>
  );
}
