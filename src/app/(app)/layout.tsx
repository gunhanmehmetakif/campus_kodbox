import { Suspense } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@/components/app-shell/app-shell-skeleton";
import { ROLE_LABEL } from "@/components/app-shell/nav";
import type { ShellUser } from "@/components/app-shell/types";
import { maskEmail } from "@/lib/mask";
import { requireUser, type CurrentUser } from "@/lib/server/auth";
import { getUnreadNotificationCount } from "@/lib/server/notifications";

/**
 * Oturum gerektiren tüm ekranların kabuğu.
 * Oturum okuma (request-time) <Suspense> içinde; iskelet statik kabuğa girer ve anında görünür.
 * Rol kontrolü alt klasörlerin layout'larında ve HER sayfada ayrıca yapılır.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

function toShellUser(user: CurrentUser): ShellUser {
  return {
    role: user.role,
    roleLabel: ROLE_LABEL[user.role],
    displayName: user.displayName,
    maskedEmail: maskEmail(user.email),
    theme: user.theme,
  };
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await getUnreadNotificationCount(user.id);
  return (
    <AppShell user={toShellUser(user)} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
