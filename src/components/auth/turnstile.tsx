"use client";

import { useEffect, useRef } from "react";

import { TURNSTILE_FIELD, TURNSTILE_SCRIPT_SRC } from "@/lib/turnstile";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type TurnstileProps = {
  siteKey: string;
  /** Pass the latest action state; the widget is reset whenever it turns into a failure. */
  resetSignal?: { ok: boolean } | null;
};

/** Invisible-first Cloudflare Turnstile widget. Writes its token into the `cf-turnstile-response` field. */
export function Turnstile({ siteKey, resetSignal }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const setToken = (value: string) => {
      if (inputRef.current) inputRef.current.value = value;
    };
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          language: "tr",
          "response-field": false,
          callback: (token: string) => setToken(token),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => setToken(""));
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (!resetSignal || resetSignal.ok) return;
    if (inputRef.current) inputRef.current.value = "";
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  return (
    <>
      <input ref={inputRef} type="hidden" name={TURNSTILE_FIELD} defaultValue="" />
      <div ref={containerRef} className="flex justify-center empty:hidden" />
    </>
  );
}
