"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeSync, ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { homePathForRole } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { BreadcrumbProvider, Breadcrumbs } from "./breadcrumbs";
import { ACCOUNT_NAV, NAV, isNavItemActive, type NavItem } from "./nav";
import { NotificationBell } from "./notification-bell";
import type { ShellUser } from "./types";
import { UserMenu } from "./user-menu";

/**
 * Uygulama kabuğu (DESIGN.md · Düzen):
 * - Solda 248px sabit kenar çubuğu: logo, rol bazlı menü, altta kullanıcı (maskeli mail) + tema.
 * - Üst bar: breadcrumb + bildirim zili. Mobilde kenar çubuğu soldan açılan sheet olur.
 * - İçerik: max 1120px, 24px gutter (mobilde 16px).
 *
 * Sunucu tarafı sarmalayıcı: src/app/(app)/layout.tsx (oturumu okur, ShellUser üretir).
 */
export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <BreadcrumbProvider>
      <ThemeSync userTheme={user.theme} />
      <a
        href="#icerik"
        className="sr-only-focusable fixed top-2 left-2 z-[60] rounded-md bg-surface px-3 py-2 text-sm font-medium text-laurel shadow-md"
      >
        İçeriğe geç
      </a>
      <div className="min-h-dvh bg-paper">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-line bg-surface lg:flex">
          <SidebarContent user={user} />
        </aside>

        <div className="flex min-h-dvh flex-col lg:pl-sidebar">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper/90 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/75 sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Menüyü aç">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-sidebar max-w-[85vw] gap-0 p-0" showCloseButton={false}>
                <SheetTitle className="sr-only">Menü</SheetTitle>
                <SheetDescription className="sr-only">Uygulama gezinme menüsü</SheetDescription>
                <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href={homePathForRole(user.role)} className="mr-1 rounded-md lg:hidden" aria-label="Kodbox ana sayfa">
              <Logo size="sm" />
            </Link>
            <Breadcrumbs className="hidden flex-1 sm:block lg:block" />
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell unreadCount={unreadCount} />
            </div>
          </header>

          <main id="icerik" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = NAV[user.role];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link
          href={homePathForRole(user.role)}
          onClick={onNavigate}
          className="rounded-md"
          aria-label="Kodbox ana sayfa"
        >
          <Logo />
        </Link>
      </div>

      <nav aria-label="Ana menü" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-3 pb-4">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="flex flex-col gap-0.5">
            {section.title ? (
              <p className="px-2.5 pb-1.5 text-xs font-medium tracking-wide text-ink-soft uppercase">{section.title}</p>
            ) : null}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isNavItemActive(item, pathname)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-0.5">
          {ACCOUNT_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isNavItemActive(item, pathname)} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
        <UserMenu user={user} />
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-ink-soft">Tema</span>
          <ThemeToggle persist />
        </div>
      </div>
    </div>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        active ? "bg-laurel-tint text-laurel" : "text-ink-soft hover:bg-paper hover:text-ink",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-laurel" : "text-ink-soft group-hover/nav:text-ink")} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
