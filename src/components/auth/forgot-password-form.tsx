"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { EmailLocalInput } from "@/components/email-local-input";
import { FormField, FormMessage } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoginKind } from "@/hooks/use-login-kind";
import { initialActionState } from "@/lib/action-state";
import type { LoginKind, SchoolIdentity } from "@/lib/identity";
import { routes } from "@/lib/routes";

import type { AuthFormAction } from "./login-form";

/**
 * Şifremi unuttum (PLAN.md §2.3). Gönderilen alanlar: kind · login · cf-turnstile-response
 * Başarıda her zaman aynı mesaj (hesap varlığı sızdırılmaz).
 */
export function ForgotPasswordForm({
  school,
  turnstileSiteKey,
  action,
}: {
  school: SchoolIdentity;
  turnstileSiteKey: string;
  action?: AuthFormAction;
}) {
  const [kind, setKind] = useLoginKind();
  const [state, formAction] = useActionState(action ?? (async () => null), initialActionState);
  const failure = state && !state.ok ? state : null;

  if (state?.ok) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-laurel-tint text-laurel">
          <MailCheckIcon className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-ink" role="status">
          {state.message ?? "Bu adresle kayıtlı bir hesap varsa şifre sıfırlama linkini gönderdik."}
        </p>
        <p className="text-label text-ink-soft">Link 1 saat geçerlidir.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={kind} onValueChange={(v) => setKind(v as LoginKind)}>
        <TabsList className="w-full" aria-label="Hesap türü">
          <TabsTrigger value="student">Öğrenci</TabsTrigger>
          <TabsTrigger value="staff">Personel</TabsTrigger>
        </TabsList>
      </Tabs>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {failure?.error ? <FormMessage>{failure.error}</FormMessage> : null}
        {!action ? (
          <FormMessage tone="info">Önizleme: şifre sıfırlama kimlik doğrulama fazında (F1) etkinleşecek.</FormMessage>
        ) : null}
        <input type="hidden" name="kind" value={kind} />
        <FormField id="login" label="Okul mailin" error={failure?.fieldErrors?.login}>
          <EmailLocalInput
            name="login"
            kind={kind}
            school={school}
            defaultValue={failure?.values?.login}
            onDomainDetected={setKind}
            placeholder={kind === "student" ? "260000009" : "ad.soyad"}
            required
          />
        </FormField>
        <TurnstileWidget siteKey={turnstileSiteKey} resetKey={state} />
        <SubmitButton size="lg" className="w-full" pendingText="Gönderiliyor…" disabled={!action}>
          Sıfırlama linki gönder
        </SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-soft">
        <Link href={routes.login} className="font-medium text-laurel hover:underline">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
