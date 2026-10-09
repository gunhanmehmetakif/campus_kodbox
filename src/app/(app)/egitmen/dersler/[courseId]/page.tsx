import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Ders" };

export default function InstructorCoursePage() {
  return (
    <PlaceholderPage
      title="Ders"
      description="Akış, materyaller, ödevler ve öğrenciler."
      emptyTitle="Bu derste henüz içerik yok"
      emptyDescription="Duyuru, materyal veya ödev eklediğinizde akışta görünür."
      icon={BookOpen}
    />
  );
}
