"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { FormField, FormMessage } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import { passwordRules } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

import type { AuthFormAction } from "./login-form";

/**
 * Şifre belirleme formu — üç kullanım:
 * - "verify": kayıt doğrulama linkinden sonra ilk şifre + KVKK onayı (PLAN.md §2.2 adım 4)
 * - "reset":  şifre sıfırlama linki (§2.3)
 * - "change": oturum açıkken değiştirme / ilk girişte zorunlu değişim (mevcut şifre istenir)
 *
 * Gönderilen alanlar: [token] · [currentPassword] · password · confirmPassword · [kvkk=on]
 */
export function SetPasswordForm({
  mode,
  token,
  action,
  submitLabel,
}: {
  mode: "verify" | "reset" | "change";
  token?: string;
  action?: AuthFormAction;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action ?? (async () => null), initialActionState);
  const failure = state && !state.ok ? state : null;
  const [password, setPassword] = useState("");

  const label =
    submitLabel ?? (mode === "verify" ? "Hesabımı etkinleştir" : mode === "reset" ? "Yeni şifreyi kaydet" : "Şifreyi değiştir");

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {failure?.error ? <FormMessage>{failure.error}</FormMessage> : null}
      {state?.ok && state.message ? <FormMessage tone="success">{state.message}</FormMessage> : null}
      {!action ? (
        <FormMessage tone="info">Önizleme: bu form kimlik doğrulama fazında (F1) etkinleşecek.</FormMessage>
      ) : null}
      {token ? <input type="hidden" name="token" value={token} /> : null}

      {mode === "change" ? (
        <FormField id="currentPassword" label="Mevcut şifre" error={failure?.fieldErrors?.currentPassword}>
          <PasswordInput name="currentPassword" autoComplete="current-password" required />
        </FormField>
      ) : null}

      <FormField id="password" label="Yeni şifre" error={failure?.fieldErrors?.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </FormField>

      <ul className="-mt-1 flex flex-wrap gap-x-4 gap-y-1" aria-label="Şifre kuralları">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className={cn("flex items-center gap-1.5 text-label", met ? "text-laurel" : "text-ink-soft")}>
              {met ? <CheckIcon className="size-3.5" aria-hidden /> : <CircleIcon className="size-3" aria-hidden />}
              {rule.label}
              <span className="sr-only">{met ? " (sağlandı)" : " (sağlanmadı)"}</span>
            </li>
          );
        })}
      </ul>

      <FormField id="confirmPassword" label="Yeni şifre (tekrar)" error={failure?.fieldErrors?.confirmPassword}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" required />
      </FormField>

      {mode === "verify" ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5">
            <Checkbox id="kvkk" name="kvkk" value="on" className="mt-0.5" aria-invalid={failure?.fieldErrors?.kvkk ? true : undefined} />
            <Label htmlFor="kvkk" className="text-sm leading-snug font-normal text-ink">
              <span>
                <a href="/kvkk" target="_blank" className="font-medium text-laurel underline underline-offset-2">
                  Aydınlatma metnini
                </a>{" "}
                okudum; okul numaramın ve okul mailimin şifreli olarak işlenmesini kabul ediyorum.
              </span>
            </Label>
          </div>
          {failure?.fieldErrors?.kvkk ? (
            <p role="alert" className="text-label font-medium text-brick">
              {failure.fieldErrors.kvkk[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      <SubmitButton size="lg" className="w-full" pendingText="Kaydediliyor…" disabled={!action}>
        {label}
      </SubmitButton>
    </form>
  );
}
