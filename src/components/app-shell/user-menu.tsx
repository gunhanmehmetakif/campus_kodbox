"use client";

import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserCogIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { updateThemePreference } from "@/lib/actions/preferences";
import { signOutAction } from "@/lib/actions/session";
import { isThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

import type { ShellUser } from "./types";

function initials(user: ShellUser): string {
  if (user.displayName) {
    // Unvanları (Prof. Dr., Dr. Öğr. Üyesi, Arş. Gör. …) atla: "Dr. Öğr. Üyesi Deniz Aksoy" → "DA"
    const TITLES = new Set(["prof", "doç", "dr", "öğr", "üyesi", "gör", "arş", "öğretim", "görevlisi"]);
    const parts = user.displayName
      .split(/\s+/)
      .filter((p) => p && !p.endsWith(".") && !TITLES.has(p.toLocaleLowerCase("tr-TR").replace(/\.$/, "")));
    const letters = (parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "");
    if (letters) return letters.toLocaleUpperCase("tr-TR");
  }
  return user.maskedEmail.slice(0, 2).toLocaleUpperCase("tr-TR");
}

/** Kenar çubuğunun altındaki kullanıcı bloğu + açılır menü (Hesabım, Tema, Çıkış yap). */
export function UserMenu({ user, className }: { user: ShellUser; className?: string }) {
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const title = user.displayName ?? user.roleLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring data-[state=open]:bg-paper",
          className,
        )}
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-laurel-tint font-display text-xs font-bold text-laurel"
        >
          {initials(user)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-ink">{title}</span>
          <span className="truncate font-mono text-xs text-ink-soft">{user.maskedEmail}</span>
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-ink-soft" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-ink-soft">{user.roleLabel}</span>
          <span className="truncate font-mono text-xs text-ink">{user.maskedEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/hesap">
              <UserCogIcon />
              Hesabım
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-ink-soft">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (!isThemeChoice(value)) return;
            setTheme(value);
            startTransition(() => void updateThemePreference(value));
          }}
        >
          <DropdownMenuRadioItem value="system">
            <MonitorIcon /> Sistem
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <SunIcon /> Açık
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon /> Koyu
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon />
              Çıkış yap
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
