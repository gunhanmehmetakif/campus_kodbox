import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { requireRole } from "@/lib/auth";

export default function InstructorLayout({ children }: LayoutProps<"/egitmen">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RoleGate>{children}</RoleGate>
    </Suspense>
  );
}

async function RoleGate({ children }: { children: React.ReactNode }) {
  await requireRole("instructor");
  return children;
}
