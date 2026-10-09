import { CalendarRangeIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Dönemler" };

/** Dönemler — F2. */
export default async function AdminTermsPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Dönemler" description="Dönem tanımlayın ve aktif dönemi seçin." phase="F2" icon={CalendarRangeIcon} />;
}
