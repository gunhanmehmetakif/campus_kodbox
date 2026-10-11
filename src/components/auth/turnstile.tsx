"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const LOAD_ERROR = "Robot doğrulaması yüklenemedi. Reklam engelleyiciyi kapatıp sayfayı yenileyin.";

/** Token readiness for a form: `waiting` is true while a widget is rendered but has no fresh token. */
export function useTurnstileToken(siteKey: string) {
  const [token, setToken] = useState("");
  const onTokenChange = useCallback((value: string) => setToken(value), []);
  return { onTokenChange, waiting: Boolean(siteKey) && !token };
}

type TurnstileProps = {
  siteKey: string;
  /** Pass the latest action state; the widget is reset and the token cleared whenever it changes. */
  resetSignal?: { ok: boolean; fieldErrors?: unknown } | null;
  /** Called with the fresh token, or "" when it is cleared, expired or failed. */
  onTokenChange?: (token: string) => void;
};

/** Visible Cloudflare Turnstile widget. Writes its token into the `cf-turnstile-response` field. */
export function Turnstile({ siteKey, resetSignal, onTokenChange }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const setToken = (value: string) => {
      if (inputRef.current) inputRef.current.value = value;
      onTokenChangeRef.current?.(value);
    };
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          appearance: "always",
          size: "flexible",
          language: "tr",
          "refresh-expired": "auto",
          "response-field": false,
          callback: (token: string) => {
            setRetrying(false);
            setToken(token);
          },
          "expired-callback": () => setToken(""),
          // Default behavior retries on its own; just tell the user.
          "error-callback": () => {
            setRetrying(true);
            setToken("");
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setToken("");
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  // Tokens are single use: every new action state needs a fresh one. Field validation failures are
  // returned before the server verifies the captcha, so the token is still valid there.
  useEffect(() => {
    if (!resetSignal) return;
    if (!resetSignal.ok && resetSignal.fieldErrors) return;
    if (inputRef.current) inputRef.current.value = "";
    onTokenChangeRef.current?.("");
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  return (
    <>
      <input ref={inputRef} type="hidden" name={TURNSTILE_FIELD} defaultValue="" />
      <div ref={containerRef} className="w-full empty:hidden" />
      {loadFailed ? (
        <p role="alert" className="text-sm text-destructive">
          {LOAD_ERROR}
        </p>
      ) : retrying ? (
        <p role="status" className="text-sm text-muted-foreground">
          Doğrulama tekrar deneniyor…
        </p>
      ) : null}
    </>
  );
}
