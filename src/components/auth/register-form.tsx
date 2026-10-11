"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  FieldError,
  FormError,
  FormNotice,
  SubmitButton,
  fieldMessages,
  formError,
  useFocusOnError,
} from "@/components/auth/form-parts";
import { MailHelpDialog } from "@/components/auth/info-dialogs";
import { SchoolEmailInput } from "@/components/auth/school-email-input";
import { Turnstile, useTurnstileToken } from "@/components/auth/turnstile";
import { Label } from "@/components/ui/label";
import { SCHOOL_EMAIL_DOMAINS } from "@/config/app";
import { registerAction, resendVerificationAction } from "@/server/auth/actions";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline";

const RESEND_SECONDS = 60;

type ResendState = Awaited<ReturnType<typeof resendVerificationAction>> | null;

type RegisterFormProps = {
  turnstileSiteKey: string;
  /** `?oauth=unlinked` was present. */
  oauthUnlinked: boolean;
};

/** Student-only registration: number box, then the "check your mail" state with a resend timer. */
export function RegisterForm({ turnstileSiteKey, oauthUnlinked }: RegisterFormProps) {
  const [local, setLocal] = useState("");
  const [state, formAction] = useActionState(registerAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const captcha = useTurnstileToken(turnstileSiteKey);
  const inputId = useId();
  const errorId = useId();

  if (state?.ok) {
    return <MailSent local={local} turnstileSiteKey={turnstileSiteKey} />;
  }

  const errors = fieldMessages(state, "local");

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        {oauthUnlinked ? (
          <FormNotice>
            Bu Google hesabı bir kullanıcıya bağlı değil. Önce kayıt olun, sonra Hesap sayfasından bağlayabilirsiniz.
          </FormNotice>
        ) : null}
        <FormError message={formError(state)} />
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>Öğrenci numarası</Label>
          <SchoolEmailInput
            id={inputId}
            name="local"
            value={local}
            onValueChange={setLocal}
            audience="student"
            invalid={Boolean(errors?.length)}
            describedBy={errors?.length ? errorId : undefined}
          />
          <FieldError id={errorId} messages={errors} />
        </div>
        <Turnstile siteKey={turnstileSiteKey} resetSignal={state} onTokenChange={captcha.onTokenChange} />
        <SubmitButton pendingLabel="Gönderiliyor…" disabled={captcha.waiting}>
          {captcha.waiting ? "Doğrulanıyor…" : "Doğrulama linki gönder"}
        </SubmitButton>
      </form>
      <Link href="/giris" className={linkClass}>
        Zaten hesabım var
      </Link>
    </div>
  );
}

function MailSent({ local, turnstileSiteKey }: { local: string; turnstileSiteKey: string }) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const formRef = useRef<HTMLFormElement>(null);
  const captcha = useTurnstileToken(turnstileSiteKey);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function resend(prev: ResendState, formData: FormData) {
    const result = await resendVerificationAction(prev, formData);
    if (result.ok) setSecondsLeft(RESEND_SECONDS);
    return result;
  }

  const [state, formAction] = useActionState(resend, null);
  useFocusOnError(formRef, state);
  const resent = state?.ok === true;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-lg font-medium">Mailinizi kontrol edin</h2>
        <p className="text-sm text-muted-foreground" role="status">
          Numaranız doğruysa okul mailinize bir doğrulama linki gönderdik.
        </p>
        <p className="font-mono text-sm break-all">
          {local}@{SCHOOL_EMAIL_DOMAINS.student}
        </p>
        <p className="text-sm text-muted-foreground">Link 24 saat geçerlidir.</p>
      </div>
      <div className="flex justify-center">
        <MailHelpDialog />
      </div>
      <form ref={formRef} action={formAction} noValidate className="space-y-3">
        <FormError message={formError(state)} />
        {resent ? <FormNotice>Yeni mail gönderildi.</FormNotice> : null}
        <input type="hidden" name="local" value={local} />
        <Turnstile siteKey={turnstileSiteKey} resetSignal={state} onTokenChange={captcha.onTokenChange} />
        <ResendButton secondsLeft={secondsLeft} waiting={captcha.waiting} />
      </form>
      <div className="flex justify-center">
        <Link href="/giris" className={linkClass}>
          Girişe dön
        </Link>
      </div>
    </div>
  );
}

function ResendButton({ secondsLeft, waiting }: { secondsLeft: number; waiting: boolean }) {
  return (
    <SubmitButton variant="outline" pendingLabel="Gönderiliyor…" disabled={secondsLeft > 0 || waiting}>
      {secondsLeft > 0 ? `Tekrar gönder (${secondsLeft} sn)` : waiting ? "Doğrulanıyor…" : "Tekrar gönder"}
    </SubmitButton>
  );
}
