"use client";

import { Loader2Icon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Form gönderim butonu. Bulunduğu <form>'un action'ı çalışırken devre dışı kalır ve
 * dönen simge + `pendingText` gösterir.
 *
 *   <SubmitButton pendingText="Yayınlanıyor…">Ödevi yayınla</SubmitButton>
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2Icon className="animate-spin" aria-hidden data-icon="inline-start" />
          <span>{pendingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
