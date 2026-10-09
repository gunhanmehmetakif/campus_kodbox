import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Denetim kaydı" };

/** Denetim kaydı — F2. */
export default async function AdminAuditPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Denetim kaydı" description="Kritik işlemlerin kaydı (kim, ne zaman, ne yaptı)." phase="F2" icon={ScrollTextIcon} />;
}
