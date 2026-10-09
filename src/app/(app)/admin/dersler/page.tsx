import { LibraryIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Dersler" };

/** Dersler — F2. */
export default async function AdminCoursesPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Dersler" description="Tüm dersler, dönem filtresi ve toplu arşivleme." phase="F2" icon={LibraryIcon} />;
}
