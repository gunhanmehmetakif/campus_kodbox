import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Ders" };

export default function StudentCoursePage() {
  return (
    <PlaceholderPage
      title="Ders"
      description="Akış, materyaller ve ödevler."
      emptyTitle="Bu derste henüz içerik yok"
      emptyDescription="Eğitmeniniz duyuru, materyal veya ödev paylaştığında burada görünür."
      icon={BookOpen}
    />
  );
}
