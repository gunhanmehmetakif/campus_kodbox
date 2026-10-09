import { Slot } from "radix-ui";
import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Etiket + kontrol + açıklama + hata (DESIGN.md: her alanın görünür etiketi olur;
 * hata alanın altında brick renginde, neyin yanlış olduğunu ve nasıl düzeltileceğini söyler).
 *
 * Tek çocuk (Input, Textarea, SelectTrigger, EmailLocalInput …) otomatik olarak
 * `id`, `aria-invalid`, `aria-describedby` ile bağlanır.
 *
 *   <FormField id="code" label="Ders kodu" description="Örn. BİL101" error={state?.fieldErrors?.code}>
 *     <Input name="code" defaultValue={state?.values?.code} />
 *   </FormField>
 */
export function FormField({
  id,
  label,
  description,
  error,
  required,
  labelAction,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  /** Server action'dan gelen `fieldErrors[alan]` (dizi) veya tek mesaj. İlk mesaj gösterilir. */
  error?: string | string[] | null;
  required?: boolean;
  /** Etiketin sağında küçük eylem (ör. "Şifremi unuttum" linki). */
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = message ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-invalid={message ? "" : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span aria-hidden className="text-brick">
              *
            </span>
          ) : null}
        </Label>
        {labelAction}
      </div>
      <Slot.Root id={id} aria-invalid={message ? true : undefined} aria-describedby={describedBy} aria-required={required || undefined}>
        {children}
      </Slot.Root>
      {description ? (
        <p id={descriptionId} className="text-label text-ink-soft">
          {description}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="text-label font-medium text-brick">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Formun üstündeki genel hata/başarı kutusu. */
export function FormMessage({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        tone === "error" && "border-brick/25 bg-brick-tint text-brick",
        tone === "success" && "border-laurel/25 bg-laurel-tint text-laurel",
        tone === "info" && "border-sky/25 bg-sky-tint text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
