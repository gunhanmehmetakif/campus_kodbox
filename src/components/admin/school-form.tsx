"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { FieldError, FormError, SubmitButton, fieldMessages, formError, useFocusOnError } from "@/components/auth/form-parts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSchoolAction } from "@/server/admin/actions";

type SchoolFormProps = {
  school: { name: string; studentEmailDomain: string; staffEmailDomain: string; studentNoRegex: string };
};

function testRegex(pattern: string, sample: string): "valid" | "invalid" | "broken" {
  try {
    return new RegExp(pattern).test(sample) ? "valid" : "invalid";
  } catch {
    return "broken";
  }
}

export function SchoolForm({ school }: SchoolFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [regex, setRegex] = useState(school.studentNoRegex);
  const [sample, setSample] = useState("");
  const ids = { name: useId(), regex: useId(), sample: useId(), student: useId(), staff: useId() };

  async function run(prev: Awaited<ReturnType<typeof updateSchoolAction>> | null, formData: FormData) {
    const result = await updateSchoolAction(prev, formData);
    if (result.ok) toast.success("Okul ayarları kaydedildi.");
    return result;
  }

  const [state, formAction, pending] = useActionState(run, null);
  useFocusOnError(formRef, state);

  const trimmedSample = sample.trim();
  const verdict = trimmedSample ? testRegex(regex.trim(), trimmedSample) : null;

  return (
    <form ref={formRef} action={formAction} className="space-y-6" noValidate>
      <FormError message={formError(state)} />

      <Card>
        <CardHeader>
          <CardTitle>Okul bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={ids.name}>Okul adı</Label>
            <Input
              id={ids.name}
              name="name"
              defaultValue={school.name}
              disabled={pending}
              aria-invalid={!!fieldMessages(state, "name") || undefined}
              aria-describedby={`${ids.name}-error`}
              className="h-11 text-base md:text-sm"
            />
            <FieldError id={`${ids.name}-error`} messages={fieldMessages(state, "name")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={ids.student}>Öğrenci mail alan adı</Label>
              <Input id={ids.student} value={school.studentEmailDomain} readOnly className="h-11 bg-muted text-base md:text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.staff}>Personel mail alan adı</Label>
              <Input id={ids.staff} value={school.staffEmailDomain} readOnly className="h-11 bg-muted text-base md:text-sm" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Alan adları hesap kimliklerinin parçası olduğu için değiştirilemez.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Öğrenci numarası kuralı</CardTitle>
          <CardDescription>
            Kayıt ve ders listesi yapıştırma sırasında numaraların geçerliliği bu düzenli ifadeyle (regex) denetlenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={ids.regex}>Düzenli ifade</Label>
            <Input
              id={ids.regex}
              name="studentNoRegex"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              disabled={pending}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!fieldMessages(state, "studentNoRegex") || undefined}
              aria-describedby={`${ids.regex}-error`}
              className="h-11 font-mono text-base md:text-sm"
            />
            <FieldError id={`${ids.regex}-error`} messages={fieldMessages(state, "studentNoRegex")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.sample}>Kuralı dene</Label>
            <Input
              id={ids.sample}
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder="Örnek numara gir"
              inputMode="numeric"
              autoComplete="off"
              className="h-11 font-mono text-base md:text-sm"
            />
            <p role="status" aria-live="polite" className="min-h-6 text-sm">
              {verdict === "valid" ? (
                <span className="inline-flex items-center gap-1.5 text-status-submitted">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Geçerli
                </span>
              ) : verdict === "invalid" ? (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <XCircle className="size-4" aria-hidden="true" />
                  Geçersiz
                </span>
              ) : verdict === "broken" ? (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <XCircle className="size-4" aria-hidden="true" />
                  Düzenli ifade geçerli değil
                </span>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <SubmitButton pendingLabel="Kaydediliyor…" className="sm:w-auto sm:px-8">
        Kaydet
      </SubmitButton>
    </form>
  );
}
