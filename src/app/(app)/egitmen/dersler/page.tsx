import { BookOpenIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Derslerim" };

/** Eğitmenin dersleri: oluşturma, öğrenci ekleme, arşiv — F3. */
export default async function InstructorCoursesPage() {
  await requireRole("instructor");
  return (
    <SectionPlaceholder
      title="Derslerim"
      description="Ders oluşturun, öğrenci ekleyin, duyuru ve materyal paylaşın."
      phase="F3"
      icon={BookOpenIcon}
      emptyTitle="Henüz ders yok"
      emptyDescription="Ders oluşturma ekranı bir sonraki sürümde eklenecek."
    />
  );
}
