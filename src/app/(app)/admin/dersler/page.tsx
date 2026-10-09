import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Dersler" };

export default function AdminCoursesPage() {
  return (
    <PlaceholderPage
      title="Dersler"
      description="Dönem filtresi ve toplu arşivleme."
      emptyTitle="Henüz ders yok"
      emptyDescription="Eğitmenler ders açtığında burada listelenir."
      icon={BookOpen}
    />
  );
}
