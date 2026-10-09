import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LogoMark } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole, routes } from "@/lib/routes";

async function Redirector(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect(routes.login);
  if (user.mustChangePassword) redirect(routes.changePassword);
  redirect(homePathForRole(user.role));
}

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Yükleniyor">
          <LogoMark className="size-12 animate-pulse" />
        </main>
      }
    >
      <Redirector />
    </Suspense>
  );
}
