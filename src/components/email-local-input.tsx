"use client";

import { useRef, useState, type ClipboardEvent, type ComponentProps, type ChangeEvent } from "react";

import { parseLoginInput, type LoginKind, type SchoolIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";

/**
 * Okul maili girişi: kullanıcı sadece yerel kısmı yazar, sağda sabit domain eki görünür.
 *
 *   [ 260000009          ] @ogr.mku.edu.tr
 *
 * - Tam mail yapıştırılır/yazılırsa `@` ve sonrası kırpılır.
 * - Domain okula aitse `onDomainDetected("student" | "staff")` çağrılır (giriş ekranı sekmeyi değiştirir).
 * - Okula ait olmayan domain'de `onForeignDomain(domain)` çağrılır (hata göstermek için).
 * - Öğrenci modunda sayısal klavye (inputMode="numeric") açılır.
 *
 * Form'a sadece yerel kısım `name` ile gönderilir; sunucu tam maili identity.ts ile kurar.
 *
 *   <FormField id="login" label="Okul mailin">
 *     <EmailLocalInput name="login" kind={tab} school={school} onDomainDetected={setTab} />
 *   </FormField>
 */
export type EmailLocalInputProps = Omit<ComponentProps<"input">, "type" | "onChange" | "value" | "defaultValue"> & {
  kind: LoginKind;
  school: SchoolIdentity;
  value?: string;
  defaultValue?: string;
  onValueChange?: (local: string) => void;
  onDomainDetected?: (kind: LoginKind) => void;
  onForeignDomain?: (domain: string) => void;
};

export function EmailLocalInput({
  kind,
  school,
  value,
  defaultValue,
  onValueChange,
  onDomainDetected,
  onForeignDomain,
  className,
  id,
  disabled,
  "aria-describedby": ariaDescribedBy,
  ...props
}: EmailLocalInputProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const inputRef = useRef<HTMLInputElement>(null);
  const domain = kind === "student" ? school.studentEmailDomain : school.staffEmailDomain;
  const suffixId = id ? `${id}-domain` : undefined;

  function commit(raw: string) {
    if (!raw.includes("@")) {
      const next = raw.replace(/\s+/g, "");
      setInner(next);
      onValueChange?.(next);
      return;
    }
    const { local, detectedKind, foreignDomain } = parseLoginInput(raw, school);
    setInner(local);
    onValueChange?.(local);
    if (detectedKind && detectedKind !== kind) onDomainDetected?.(detectedKind);
    if (foreignDomain && raw.split("@")[1]?.includes(".")) onForeignDomain?.(foreignDomain);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes("@")) {
      e.preventDefault();
      commit(text);
    }
  }

  return (
    <div
      className={cn(
        "group/email flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-input bg-surface transition-colors",
        "focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        "has-aria-invalid:border-destructive",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={current}
        onChange={(e: ChangeEvent<HTMLInputElement>) => commit(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled}
        inputMode={kind === "student" ? "numeric" : "email"}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-ink-soft/55 md:text-sm",
          kind === "student" && "font-mono tabular-nums",
        )}
        {...props}
        aria-describedby={[ariaDescribedBy, suffixId].filter(Boolean).join(" ") || undefined}
      />
      <span
        id={suffixId}
        className="flex shrink-0 items-center border-l border-line bg-paper px-3 font-mono text-label text-ink-soft select-none"
      >
        @{domain}
      </span>
    </div>
  );
}
