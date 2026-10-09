"use client";

import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useEffect, useTransition } from "react";

import { persistTheme, useTheme } from "@/hooks/use-theme";
import { updateThemePreference } from "@/lib/actions/preferences";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Sistem", icon: MonitorIcon },
  { value: "light", label: "Açık", icon: SunIcon },
  { value: "dark", label: "Koyu", icon: MoonIcon },
];

/**
 * Tema anahtarı: Sistem · Açık · Koyu (radyo grubu, klavyeyle ←/→).
 * `persist` true ise (oturum açık) tercih hesaba da kaydedilir.
 */
export function ThemeToggle({ persist = false, className }: { persist?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  function choose(value: ThemeChoice) {
    setTheme(value);
    if (persist) startTransition(() => void updateThemePreference(value));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = OPTIONS.findIndex((o) => o.value === theme);
    const next = OPTIONS[(idx + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length]!;
    choose(next.value);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
    el?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            data-value={value}
            tabIndex={active ? 0 : -1}
            onClick={() => choose(value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              active && "bg-surface text-laurel ring-1 ring-line",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Oturum açık kullanıcının hesabındaki tema tercihini bu cihaza uygular
 * (başka cihazda değiştirildiyse). App shell'de bir kez kullanılır.
 */
export function ThemeSync({ userTheme }: { userTheme: ThemeChoice }) {
  useEffect(() => {
    let local: string | null = null;
    try {
      local = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return;
    }
    const current = local === "light" || local === "dark" ? local : "system";
    if (current !== userTheme) persistTheme(userTheme);
  }, [userTheme]);
  return null;
}
