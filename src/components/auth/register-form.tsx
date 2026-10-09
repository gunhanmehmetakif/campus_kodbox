"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { EmailLocalInput } from "@/components/email-local-input";
import { FormField, FormMessage } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialActionState } from "@/lib/action-state";
import type { SchoolIdentity } from "@/lib/identity";
import { routes } from "@/lib/routes";

import type { AuthFormAction } from "./login-form";

export type SchoolOption = { id: string; name: string; identity: SchoolIdentity };

/**
 * Öğrenci kayıt formu (PLAN.md §2.2). Gönderilen alanlar:
 *   schoolId · studentNo · cf-turnstile-response
 * Başarıda ekranda HER ZAMAN aynı mesaj gösterilir (hesap varlığı sızdırılmaz).
 */
export function RegisterForm({
  schools,
  turnstileSiteKey,
  action,
}: {
  schools: SchoolOption[];
  turnstileSiteKey: string;
  action?: AuthFormAction;
}) {
  const [state, formAction] = useActionState(action ?? (async () => null), initialActionState);
  const failure = state && !state.ok ? state : null;
  const school = schools[0];

  if (state?.ok) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-laurel-tint text-laurel">
          <MailCheckIcon className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-ink" role="status">
          {state.message ?? "Numaran doğruysa okul mailine bir doğrulama linki gönderdik."}
        </p>
        <p className="text-label text-ink-soft">Mail birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bak.</p>
      </div>
    );
  }

  if (!school) return <FormMessage>Kayıt için tanımlı okul yok. Yöneticiye haber ver.</FormMessage>;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {failure?.error ? <FormMessage>{failure.error}</FormMessage> : null}
      {!action ? (
        <FormMessage tone="info">Önizleme: kayıt işlemi kimlik doğrulama fazında (F1) etkinleşecek.</FormMessage>
      ) : null}

      <FormField id="schoolId" label="Okul" error={failure?.fieldErrors?.schoolId}>
        <Select name="schoolId" defaultValue={school.id} disabled={schools.length === 1}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      {schools.length === 1 ? <input type="hidden" name="schoolId" value={school.id} /> : null}

      <FormField
        id="studentNo"
        label="Öğrenci numaran"
        description="Doğrulama linki bu numaranın okul mailine gönderilir."
        error={failure?.fieldErrors?.studentNo}
      >
        <EmailLocalInput
          name="studentNo"
          kind="student"
          school={school.identity}
          defaultValue={failure?.values?.studentNo}
          placeholder="260000009"
          required
        />
      </FormField>

      <TurnstileWidget siteKey={turnstileSiteKey} resetKey={state} />

      <SubmitButton size="lg" className="w-full" pendingText="Gönderiliyor…" disabled={!action}>
        Doğrulama linki gönder
      </SubmitButton>

      <p className="text-center text-sm text-ink-soft">
        Zaten hesabın var mı?{" "}
        <Link href={routes.login} className="font-medium text-laurel hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
