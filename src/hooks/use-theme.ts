"use client";

import { useCallback, useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY, isThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * Tema durumu (harici store: localStorage + <html data-theme> + prefers-color-scheme).
 *
 *   const { theme, resolvedTheme, setTheme } = useTheme();
 *
 * `setTheme` sadece tarayıcıyı günceller. Kullanıcının hesabına kaydetmek için
 * components/theme/theme-toggle.tsx içindeki server action çağrısına bakın.
 */

const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(readChoice());
      emit();
    }
  };
  media.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Tercihi <html>'e uygular. */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/** Tercihi kaydeder + uygular + abonelere haber verir. */
export function persistTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Gizli mod vb.: sadece bu sekmede uygula.
  }
  applyTheme(choice);
  emit();
}

const getServerChoice = (): ThemeChoice => "system";
const getServerResolved = (): "light" | "dark" => "light";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readChoice, getServerChoice);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    () => {
      const choice = readChoice();
      return choice === "system" ? (systemPrefersDark() ? "dark" : "light") : choice;
    },
    getServerResolved,
  );
  const setTheme = useCallback((choice: ThemeChoice) => persistTheme(choice), []);
  return { theme, resolvedTheme, setTheme } as const;
}
