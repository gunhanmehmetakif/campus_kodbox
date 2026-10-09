"use client";

import { useId } from "react";

import { SCHOOL_EMAIL_DOMAINS, type SchoolAudience } from "@/config/app";
import { cn } from "@/lib/utils";

type SchoolEmailInputProps = {
  /** Local part only (what is left of the fixed domain). */
  value: string;
  onValueChange: (value: string) => void;
  /** Tab whose fixed domain is shown on the right. */
  audience: SchoolAudience;
  /** Called when a pasted full mail matches the other tab's domain. */
  onAudienceSuggest?: (audience: SchoolAudience) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

const PLACEHOLDERS: Record<SchoolAudience, string> = {
  student: "260000009",
  staff: "ahmet.yilmaz",
};

/**
 * Mail box with a fixed, non-editable domain suffix. When a full address is typed or pasted,
 * everything from "@" on is dropped and the matching tab is suggested via onAudienceSuggest.
 */
export function SchoolEmailInput({
  value,
  onValueChange,
  audience,
  onAudienceSuggest,
  id,
  name = "identifier",
  disabled,
  invalid,
  className,
}: SchoolEmailInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const domain = SCHOOL_EMAIL_DOMAINS[audience];

  function handleChange(raw: string) {
    const at = raw.indexOf("@");
    if (at === -1) {
      onValueChange(raw.trim());
      return;
    }
    const local = raw.slice(0, at).trim();
    const typedDomain = raw.slice(at + 1).trim().toLowerCase();
    onValueChange(local);
    const match = (Object.keys(SCHOOL_EMAIL_DOMAINS) as SchoolAudience[]).find(
      (key) => SCHOOL_EMAIL_DOMAINS[key] === typedDomain,
    );
    if (match && match !== audience) onAudienceSuggest?.(match);
  }

  return (
    <div
      className={cn(
        "flex h-11 w-full min-w-0 items-center overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        id={inputId}
        name={name}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={PLACEHOLDERS[audience]}
        inputMode={audience === "student" ? "numeric" : "email"}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <span
        className="flex h-full shrink-0 items-center border-l border-input bg-muted px-3 text-sm text-muted-foreground select-none"
        aria-hidden="true"
      >
        @{domain}
      </span>
      <span className="sr-only">@{domain}</span>
    </div>
  );
}
