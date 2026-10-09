"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { EmailLocalInput } from "@/components/email-local-input";
import { FormField, FormMessage } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoginKind } from "@/hooks/use-login-kind";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { LoginKind, SchoolIdentity } from "@/lib/identity";
import { routes } from "@/lib/routes";

import { AuthDivider } from "./auth-layout";
import { OAuthButtons } from "./oauth-buttons";

export type AuthFormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const noopAction: AuthFormAction = async () => null;

/**
 * Giriş formu (PLAN.md §2.1). Gönderilen alanlar:
 *   kind ("student" | "staff") · login (mailin yerel kısmı) · password · next · cf-turnstile-response
 *
 * F0: görsel iskelet. F1 `action` prop'unu bağlar; `action` yoksa gönderim kapalıdır.
 */
export function LoginForm({
  school,
  turnstileSiteKey,
  googleEnabled,
  appleEnabled,
  next,
  notice,
  action,
}: {
  school: SchoolIdentity;
  turnstileSiteKey: string;
  googleEnabled: boolean;
  appleEnabled: boolean;
  next?: string;
  /** Formun üstünde gösterilecek bilgi (ör. OAuth hesabı bağlı değil uyarısı). */
  notice?: { tone: "error" | "info" | "success"; text: string } | null;
  action?: AuthFormAction;
}) {
  const [kind, setKind] = useLoginKind();
  const [state, formAction] = useActionState(action ?? noopAction, initialActionState);
  const [foreignDomain, setForeignDomain] = useState<string | null>(null);
  const failure = state && !state.ok ? state : null;

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={kind} onValueChange={(v) => setKind(v as LoginKind)}>
        <TabsList className="w-full" aria-label="Giriş türü">
          <TabsTrigger value="student">Öğrenci</TabsTrigger>
          <TabsTrigger value="staff">Personel</TabsTrigger>
        </TabsList>
      </Tabs>

      {notice ? <FormMessage tone={notice.tone}>{notice.text}</FormMessage> : null}
      {failure?.error ? <FormMessage>{failure.error}</FormMessage> : null}
      {!action ? (
        <FormMessage tone="info">Önizleme: giriş işlemi kimlik doğrulama fazında (F1) etkinleşecek.</FormMessage>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="kind" value={kind} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <FormField
          id="login"
          label="Okul mailin"
          error={
            failure?.fieldErrors?.login ??
            (foreignDomain
              ? `${foreignDomain} okul adresi değil. Sadece kullanıcı adını yaz; domain otomatik eklenir.`
              : undefined)
          }
          description={kind === "student" ? "Öğrenci numaran" : "Okul mailinin @ öncesi"}
        >
          <EmailLocalInput
            name="login"
            kind={kind}
            school={school}
            defaultValue={failure?.values?.login}
            onDomainDetected={(k) => {
              setForeignDomain(null);
              setKind(k);
            }}
            onForeignDomain={setForeignDomain}
            onValueChange={() => setForeignDomain(null)}
            placeholder={kind === "student" ? "260000009" : "ad.soyad"}
            required
          />
        </FormField>

        <FormField
          id="password"
          label="Şifre"
          error={failure?.fieldErrors?.password}
          labelAction={
            <Link href={routes.forgotPassword} className="text-label font-medium text-laurel hover:underline">
              Şifremi unuttum
            </Link>
          }
        >
          <PasswordInput name="password" autoComplete="current-password" required />
        </FormField>

        <TurnstileWidget siteKey={turnstileSiteKey} resetKey={state} />

        <SubmitButton size="lg" className="w-full" pendingText="Giriş yapılıyor…" disabled={!action}>
          Giriş yap
        </SubmitButton>
      </form>

      {googleEnabled || appleEnabled ? (
        <>
          <AuthDivider />
          <OAuthButtons google={googleEnabled} apple={appleEnabled} />
        </>
      ) : null}

      <p className="text-center text-sm text-ink-soft">
        Hesabın yok mu?{" "}
        <Link href={routes.register} className="font-medium text-laurel hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
