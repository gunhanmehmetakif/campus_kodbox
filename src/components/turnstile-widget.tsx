"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/hooks/use-theme";
import { TURNSTILE_FIELD, TURNSTILE_SCRIPT_SRC } from "@/lib/turnstile";
import { cn } from "@/lib/utils";

/**
 * Cloudflare Turnstile robot doğrulaması (çoğu kullanıcıda görünmez/tek tık).
 * <form> içine koyun; widget forma `cf-turnstile-response` gizli alanını ekler.
 * Sunucuda: verifyTurnstile(formData.get(TURNSTILE_FIELD), ip) — src/lib/server/turnstile.ts
 *
 *   <TurnstileWidget siteKey={siteKey} resetKey={state} />
 *
 * `siteKey` sunucu bileşeninden prop olarak gelir (getTurnstileSiteKey()).
 * `resetKey` değiştiğinde (ör. action sonucu) widget yeni token üretir — token tek kullanımlıktır.
 */

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  siteKey,
  resetKey,
  onVerify,
  className,
}: {
  siteKey: string;
  resetKey?: unknown;
  onVerify?: (token: string | null) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && Boolean(window.turnstile));
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    const el = containerRef.current;
    if (!ready || !el || !window.turnstile) return;
    const id = window.turnstile.render(el, {
      sitekey: siteKey,
      theme: resolvedTheme,
      language: "tr",
      "response-field-name": TURNSTILE_FIELD,
      callback: (token: string) => onVerifyRef.current?.(token),
      "expired-callback": () => onVerifyRef.current?.(null),
      "error-callback": () => {
        onVerifyRef.current?.(null);
        return false;
      },
    });
    widgetIdRef.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetIdRef.current = null;
    };
  }, [ready, siteKey, resolvedTheme]);

  useEffect(() => {
    if (resetKey === undefined || !widgetIdRef.current) return;
    window.turnstile?.reset(widgetIdRef.current);
    onVerifyRef.current?.(null);
  }, [resetKey]);

  return (
    <>
      <Script src={TURNSTILE_SCRIPT_SRC} strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setFailed(true)} />
      <div ref={containerRef} className={cn("min-h-[65px]", className)} />
      {failed ? (
        <p role="alert" className="text-label text-brick">
          Robot doğrulaması yüklenemedi. Reklam engelleyiciyi kapatıp sayfayı yenile.
        </p>
      ) : null}
    </>
  );
}
