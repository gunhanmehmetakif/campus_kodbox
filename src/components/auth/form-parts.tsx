"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, type RefObject } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";

export type FormState<T = unknown> = ActionResult<T> | null;

/** Field level messages of a failed action result, if any. */
export function fieldMessages(state: FormState, key: string): string[] | undefined {
  return state && !state.ok ? state.fieldErrors?.[key] : undefined;
}

/** Form level error text of a failed action result. */
export function formError(state: FormState): string | undefined {
  return state && !state.ok ? state.error : undefined;
}

/** Announced error box shown above the form fields. */
export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      tabIndex={-1}
      data-form-error
      className={cn(
        "flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive outline-none",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** Neutral information box (not an error). */
export function FormNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground", className)}>
      {children}
    </div>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {messages.join(" ")}
    </p>
  );
}

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
};

/** Submit button that disables itself while the parent form's action is pending. */
export function SubmitButton({ children, pendingLabel = "Gönderiliyor…", className, variant, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      variant={variant}
      disabled={pending || disabled}
      className={cn("h-11 w-full text-sm", className)}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Moves focus to the first invalid field (or the error box) whenever an action fails. */
export function useFocusOnError(formRef: RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (!state || state.ok) return;
    const form = formRef.current;
    if (!form) return;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.querySelector<HTMLElement>("[data-form-error]");
    target?.focus();
  }, [state, formRef]);
}
