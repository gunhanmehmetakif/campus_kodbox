import { UsersIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Eğitmenler" };

/** Eğitmenler — F2. */
export default async function AdminInstructorsPage() {
  await requireRole("admin");
  return <SectionPlaceholder title="Eğitmenler" description="Eğitmen hesabı oluşturun, düzenleyin, şifre sıfırlayın veya devre dışı bırakın." phase="F2" icon={UsersIcon} />;
}
