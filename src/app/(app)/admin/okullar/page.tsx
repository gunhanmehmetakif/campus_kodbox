import { SchoolIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Okullar" };

/** Okullar — F2. */
export default async function AdminSchoolsPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Okullar" description="Okul adı, mail domain'leri ve öğrenci numarası formatı." phase="F2" icon={SchoolIcon} />;
}
