"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Uygulama içi beklenmeyen hata sınırı (kabuk korunur, sadece içerik değişir). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brick-tint text-brick">
        <TriangleAlertIcon className="size-5" aria-hidden />
      </span>
      <h1 className="text-lg font-bold">Bir şeyler ters gitti</h1>
      <p className="max-w-[46ch] text-sm text-ink-soft">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar dene; sorun sürerse yöneticiye bu kodu ilet:
      </p>
      {error.digest ? <code className="rounded bg-paper px-2 py-1 font-mono text-xs text-ink">{error.digest}</code> : null}
      <Button onClick={reset} className="mt-2">
        Tekrar dene
      </Button>
    </div>
  );
}
