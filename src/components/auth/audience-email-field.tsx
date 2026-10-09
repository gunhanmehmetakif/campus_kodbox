"use client";

import { useId, useState } from "react";

import { SchoolEmailInput } from "@/components/auth/school-email-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDIENCE_LABELS, type SchoolAudience } from "@/config/app";

type AudienceEmailFieldProps = {
  defaultAudience?: SchoolAudience;
  /** Hide the tabs and lock to one audience (e.g. registration is student-only). */
  lockAudience?: SchoolAudience;
};

/** Öğrenci | Personel tabs plus the school mail box. Form submission is wired in F1. */
export function AudienceEmailField({ defaultAudience = "student", lockAudience }: AudienceEmailFieldProps) {
  const [audience, setAudience] = useState<SchoolAudience>(lockAudience ?? defaultAudience);
  const [identifier, setIdentifier] = useState("");
  const inputId = useId();
  const active = lockAudience ?? audience;

  return (
    <div className="space-y-4">
      {lockAudience ? null : (
        <Tabs value={audience} onValueChange={(v) => setAudience(v as SchoolAudience)}>
          <TabsList className="grid h-11! w-full grid-cols-2">
            {(Object.keys(AUDIENCE_LABELS) as SchoolAudience[]).map((key) => (
              <TabsTrigger key={key} value={key} className="h-9 text-sm">
                {AUDIENCE_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{active === "student" ? "Öğrenci numarası" : "Okul maili"}</Label>
        <SchoolEmailInput
          id={inputId}
          value={identifier}
          onValueChange={setIdentifier}
          audience={active}
          onAudienceSuggest={lockAudience ? undefined : setAudience}
        />
      </div>
    </div>
  );
}
