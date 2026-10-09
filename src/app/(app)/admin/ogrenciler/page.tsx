import { GraduationCapIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Öğrenciler" };

/** Öğrenciler — F2. */
export default async function AdminStudentsPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Öğrenciler" description="Maskeli numarayla arama, hesap durumu, devre dışı bırakma." phase="F2" icon={GraduationCapIcon} />;
}
