import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import { BottomNav } from "./bottom-nav";
import { ROLE_HOME } from "./nav-items";
import { NotificationBell } from "./notification-bell";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/**
 * Authenticated frame: top bar, desktop sidebar, mobile bottom bar.
 * Reads the session, so it must render inside a Suspense boundary (see (app)/layout.tsx).
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.mustChangePassword) redirect("/sifre-degistir");

  const label = user.displayName ?? (user.role === "student" ? "Öğrenci" : "Hesabım");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-5">
        <Link
          href={ROLE_HOME[user.role]}
          className="flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell count={0} />
          <UserMenu role={user.role} label={label} />
        </div>
      </header>
      <div className="flex min-w-0 flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
          <SidebarNav role={user.role} />
        </aside>
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <BottomNav role={user.role} />
    </div>
  );
}

/** Fallback while the session is being resolved. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Yükleniyor">
      <header className="flex h-14 items-center justify-between border-b px-3 sm:px-5">
        <Logo />
        <Skeleton className="size-9 rounded-full" />
      </header>
      <div className="flex-1 space-y-4 px-4 pt-5 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full max-w-5xl rounded-xl" />
      </div>
    </div>
  );
}
