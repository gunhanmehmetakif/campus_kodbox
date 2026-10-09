"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { LoginKind } from "@/lib/identity";

/**
 * Giriş/şifre sıfırlama ekranlarındaki Öğrenci | Personel sekmesi.
 * PLAN.md §2.1: son seçilen sekme tarayıcıda hatırlanır (localStorage).
 */
const KEY = "kodbox-login-kind";
const listeners = new Set<() => void>();

function read(): LoginKind {
  try {
    return localStorage.getItem(KEY) === "staff" ? "staff" : "student";
  } catch {
    return "student";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLoginKind(): [LoginKind, (kind: LoginKind) => void] {
  const kind = useSyncExternalStore(subscribe, read, () => "student" as const);
  const setKind = useCallback((next: LoginKind) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // gizli mod: sadece bu oturumda
    }
    for (const l of listeners) l();
  }, []);
  return [kind, setKind];
}
