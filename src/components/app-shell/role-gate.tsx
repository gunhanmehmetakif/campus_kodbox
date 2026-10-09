import { Suspense, type ReactNode } from "react";

import type { UserRole } from "@/db/schema";
import { requireRole } from "@/lib/server/auth";

import { PageSkeleton } from "./app-shell-skeleton";

/**
 * Rol klasörü layout'ları için kapı. Oturum/rol okuması kendi <Suspense> sınırı içinde
 * yapılır; böylece başka bir bölümden bu bölüme gezinirken iskelet anında görünür
 * (Cache Components "instant navigation" kuralı).
 */
export function RoleGate({ role, children }: { role: UserRole; children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Gate role={role}>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ role, children }: { role: UserRole; children: ReactNode }) {
  await requireRole(role);
  return children;
}
