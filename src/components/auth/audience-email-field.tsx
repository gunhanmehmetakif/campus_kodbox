"use client";

import { useEffect, useId, useState } from "react";

import { FieldError } from "@/components/auth/form-parts";
import { SchoolEmailInput } from "@/components/auth/school-email-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDIENCE_LABELS, type SchoolAudience } from "@/config/app";

type AudienceEmailFieldProps = {
  defaultAudience?: SchoolAudience;
  /** Hide the tabs and lock to one audience (e.g. registration is student-only). */
  lockAudience?: SchoolAudience;
  /** localStorage key that remembers the last selected tab. */
  storageKey?: string;
  /** Field errors for `local`. */
  errors?: string[];
};

function readStoredAudience(key: string): SchoolAudience | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === "student" || value === "staff" ? value : null;
  } catch {
    return null;
  }
}

function storeAudience(key: string, value: SchoolAudience) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode); the tab simply is not remembered
  }
}

/**
 * Öğrenci | Personel tabs plus the school mail box. Submits `kind` and `local`
 * (docs/fazlar/F1-kimlik.md section 1).
 */
export function AudienceEmailField({
  defaultAudience = "student",
  lockAudience,
  storageKey,
  errors,
}: AudienceEmailFieldProps) {
  const [audience, setAudience] = useState<SchoolAudience>(lockAudience ?? defaultAudience);
  const [identifier, setIdentifier] = useState("");
  const inputId = useId();
  const errorId = useId();
  const active = lockAudience ?? audience;

  useEffect(() => {
    if (lockAudience || !storageKey) return;
    const stored = readStoredAudience(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    if (stored) setAudience(stored);
  }, [lockAudience, storageKey]);

  function changeAudience(next: SchoolAudience) {
    setAudience(next);
    if (storageKey) storeAudience(storageKey, next);
  }

  return (
    <div className="space-y-4">
      {lockAudience ? null : (
        <>
          <input type="hidden" name="kind" value={active} />
          <Tabs value={audience} onValueChange={(v) => changeAudience(v as SchoolAudience)}>
            <TabsList className="grid h-11! w-full grid-cols-2">
              {(Object.keys(AUDIENCE_LABELS) as SchoolAudience[]).map((key) => (
                <TabsTrigger key={key} value={key} className="h-9 text-sm">
                  {AUDIENCE_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{active === "student" ? "Öğrenci numarası" : "Okul maili"}</Label>
        <SchoolEmailInput
          id={inputId}
          name="local"
          value={identifier}
          onValueChange={setIdentifier}
          audience={active}
          onAudienceSuggest={lockAudience ? undefined : changeAudience}
          invalid={Boolean(errors?.length)}
          describedBy={errors?.length ? errorId : undefined}
        />
        <FieldError id={errorId} messages={errors} />
      </div>
    </div>
  );
}
