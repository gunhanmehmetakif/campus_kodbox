import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LogoMark } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth";

const ROLE_HOME = {
  admin: "/admin",
  instructor: "/egitmen",
  student: "/ogrenci",
} as const;

async function Redirector(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.mustChangePassword) redirect("/sifre-degistir");
  redirect(ROLE_HOME[user.role]);
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
