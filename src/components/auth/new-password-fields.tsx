"use client";

import { Check, Circle } from "lucide-react";
import { useId, useState } from "react";

import { FieldError } from "@/components/auth/form-parts";
import { PasswordInput } from "@/components/auth/password-input";
import { Label } from "@/components/ui/label";
import { passwordRules } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type NewPasswordFieldsProps = {
  passwordErrors?: string[];
  confirmErrors?: string[];
};

/** New password + confirmation with a live rule checklist (names: `password`, `confirmPassword`). */
export function NewPasswordFields({ passwordErrors, confirmErrors }: NewPasswordFieldsProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const passwordId = useId();
  const confirmId = useId();
  const rulesId = useId();
  const passwordErrorId = useId();
  const confirmErrorId = useId();

  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmMessages = confirmErrors ?? (mismatch ? ["Şifreler eşleşmiyor. Aynı şifreyi iki kez yaz."] : undefined);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={passwordId}>Yeni şifre</Label>
        <PasswordInput
          id={passwordId}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={passwordErrors?.length ? true : undefined}
          aria-describedby={[rulesId, passwordErrors?.length ? passwordErrorId : null].filter(Boolean).join(" ")}
        />
        <ul id={rulesId} className="space-y-1 pt-1 text-sm">
          {passwordRules.map((rule) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.id}
                className={cn("flex items-center gap-2", passed ? "text-status-submitted" : "text-muted-foreground")}
              >
                {passed ? (
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>{rule.label}</span>
                <span className="sr-only">{passed ? "(sağlandı)" : "(sağlanmadı)"}</span>
              </li>
            );
          })}
        </ul>
        <FieldError id={passwordErrorId} messages={passwordErrors} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={confirmId}>Şifre tekrar</Label>
        <PasswordInput
          id={confirmId}
          name="confirmPassword"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={confirmMessages?.length ? true : undefined}
          aria-describedby={confirmMessages?.length ? confirmErrorId : undefined}
        />
        <FieldError id={confirmErrorId} messages={confirmMessages} />
      </div>
    </>
  );
}
