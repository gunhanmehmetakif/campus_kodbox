"use client";

import Link from "next/link";
import { useActionState, useId, useRef } from "react";

import {
  FieldError,
  FormError,
  FormNotice,
  SubmitButton,
  fieldMessages,
  formError,
  useFocusOnError,
} from "@/components/auth/form-parts";
import { KvkkDialog } from "@/components/auth/info-dialogs";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { PasswordInput } from "@/components/auth/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, completeRegistrationAction, resetPasswordAction } from "@/server/auth/actions";

/** Read-only mail box so password managers pair the new password with the right username. */
function ReadOnlyEmail({ email }: { email: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Okul maili</Label>
      <Input id={id} type="email" value={email} readOnly autoComplete="username" className="h-11 bg-muted text-base md:text-sm" />
    </div>
  );
}

/** /dogrula/[token]: set the first password and accept the KVKK notice. */
export function CompleteRegistrationForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(completeRegistrationAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const kvkkId = useId();
  const kvkkErrorId = useId();
  const kvkkErrors = fieldMessages(state, "kvkk");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <FormError message={formError(state)} />
      <input type="hidden" name="token" value={token} />
      <ReadOnlyEmail email={email} />
      <NewPasswordFields
        passwordErrors={fieldMessages(state, "password")}
        confirmErrors={fieldMessages(state, "confirmPassword")}
      />
      <div className="space-y-1">
        <div className="flex items-start gap-2.5 py-1.5">
          <Checkbox
            id={kvkkId}
            name="kvkk"
            className="mt-0.5"
            aria-invalid={kvkkErrors?.length ? true : undefined}
            aria-describedby={kvkkErrors?.length ? kvkkErrorId : undefined}
          />
          <Label htmlFor={kvkkId} className="text-sm leading-snug font-normal">
            KVKK aydınlatma metnini okudum, onaylıyorum.
          </Label>
        </div>
        <KvkkDialog />
        <FieldError id={kvkkErrorId} messages={kvkkErrors} />
      </div>
      <SubmitButton pendingLabel="Etkinleştiriliyor…">Hesabı etkinleştir</SubmitButton>
    </form>
  );
}

/** /sifre-sifirla/[token] */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <FormError message={formError(state)} />
      <input type="hidden" name="token" value={token} />
      <ReadOnlyEmail email={email} />
      <NewPasswordFields
        passwordErrors={fieldMessages(state, "password")}
        confirmErrors={fieldMessages(state, "confirmPassword")}
      />
      <SubmitButton pendingLabel="Kaydediliyor…">Şifreyi kaydet</SubmitButton>
    </form>
  );
}

/** /sifre-degistir: forced first-login change or a voluntary one. */
export function ChangePasswordForm({ mustChange }: { mustChange: boolean }) {
  const [state, formAction] = useActionState(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const currentId = useId();
  const currentErrorId = useId();
  const currentErrors = fieldMessages(state, "currentPassword");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {mustChange ? <FormNotice>Devam etmek için şifrenizi değiştirin.</FormNotice> : null}
      <FormError message={formError(state)} />
      <div className="space-y-1.5">
        <Label htmlFor={currentId}>{mustChange ? "Geçici şifre" : "Mevcut şifre"}</Label>
        <PasswordInput
          id={currentId}
          name="currentPassword"
          autoComplete="current-password"
          aria-invalid={currentErrors?.length ? true : undefined}
          aria-describedby={currentErrors?.length ? currentErrorId : undefined}
        />
        <FieldError id={currentErrorId} messages={currentErrors} />
      </div>
      <NewPasswordFields
        passwordErrors={fieldMessages(state, "password")}
        confirmErrors={fieldMessages(state, "confirmPassword")}
      />
      <SubmitButton pendingLabel="Kaydediliyor…">Şifreyi değiştir</SubmitButton>
      {mustChange ? null : (
        <Link
          href="/hesap"
          className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline"
        >
          Vazgeç
        </Link>
      )}
    </form>
  );
}
