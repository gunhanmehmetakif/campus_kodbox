"use client";

import Link from "next/link";
import { useActionState, useId, useRef } from "react";

import { AudienceEmailField } from "@/components/auth/audience-email-field";
import {
  FieldError,
  FormError,
  SubmitButton,
  fieldMessages,
  formError,
  useFocusOnError,
} from "@/components/auth/form-parts";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Turnstile, useTurnstileToken } from "@/components/auth/turnstile";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/server/auth/actions";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline";

type LoginFormProps = {
  googleEnabled: boolean;
  turnstileSiteKey: string;
  /** Already sanitized with safeRedirectPath; empty when there is none. */
  next: string;
  /** `?oauth=error` was present. */
  oauthError: boolean;
};

/** Login screen body (PRD 2.1). */
export function LoginForm({ googleEnabled, turnstileSiteKey, next, oauthError }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const captcha = useTurnstileToken(turnstileSiteKey);
  const passwordId = useId();
  const passwordErrorId = useId();
  const rememberId = useId();

  const passwordErrors = fieldMessages(state, "password");
  const error =
    formError(state) ??
    (oauthError ? "Google ile giriş yapılamadı. Tekrar deneyin ya da okul mailinizle giriş yapın." : undefined);
  const googleHref = `/api/auth/google?intent=login${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        <FormError message={error} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AudienceEmailField storageKey="kodbox:login-audience" errors={fieldMessages(state, "local")} />
        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>Şifre</Label>
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="current-password"
            aria-invalid={passwordErrors?.length ? true : undefined}
            aria-describedby={passwordErrors?.length ? passwordErrorId : undefined}
          />
          <FieldError id={passwordErrorId} messages={passwordErrors} />
        </div>
        <div className="flex min-h-11 items-center gap-2.5">
          <Checkbox id={rememberId} name="remember" defaultChecked />
          <Label htmlFor={rememberId} className="text-sm font-normal">
            Beni hatırla
          </Label>
        </div>
        <Turnstile siteKey={turnstileSiteKey} resetSignal={state} onTokenChange={captcha.onTokenChange} />
        <SubmitButton pendingLabel="Giriş yapılıyor…" disabled={captcha.waiting}>
          {captcha.waiting ? "Doğrulanıyor…" : "Giriş yap"}
        </SubmitButton>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
            <span className="h-px flex-1 bg-border" />
            veya
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton href={googleHref} />
        </>
      ) : null}

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
