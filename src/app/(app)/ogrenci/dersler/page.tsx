import { BookOpenIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Derslerim" };

/** Öğrencinin dersleri (aktif dönem + geçmiş dersler) — F5. */
export default async function StudentCoursesPage() {
  await requireRole("student");
  return (
    <SectionPlaceholder
      title="Derslerim"
      description="Kayıtlı olduğun dersler ve geçmiş dönem dersleri."
      phase="F5"
      icon={BookOpenIcon}
      emptyTitle="Henüz bir derse eklenmedin"
      emptyDescription="Eğitmenin seni derse eklediğinde ders burada otomatik görünür."
    />
  );
}
