"use client";

import { LogOut, UserCog } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logoutAction } from "@/server/auth/actions";

import { ROLE_LABELS, type Role } from "./nav-items";

type UserMenuProps = {
  role: Role;
  /** Display name, or the student's own number. */
  label: string;
};

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : label.trim().slice(0, 2);
  return letters.toLocaleUpperCase("tr-TR");
}

export function UserMenu({ role, label }: UserMenuProps) {
  const [, logout] = useActionState(logoutAction, null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Kullanıcı menüsü"
        className="flex size-11 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initials(label)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs font-normal text-muted-foreground">{ROLE_LABELS[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11">
          <Link href="/hesap">
            <UserCog aria-hidden="true" />
            Hesap ayarları
          </Link>
        </DropdownMenuItem>
        <form action={logout}>
          <DropdownMenuItem asChild className="min-h-11" onSelect={(e) => e.preventDefault()}>
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Çıkış yap
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
