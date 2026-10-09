import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Eğitmenler" };

export default function AdminInstructorsPage() {
  return (
    <PlaceholderPage
      title="Eğitmenler"
      description="Eğitmen hesaplarını oluşturun ve yönetin."
      emptyTitle="Henüz eğitmen hesabı yok"
      emptyDescription="İlk eğitmen hesabını oluşturduğunuzda burada listelenir."
      icon={GraduationCap}
    />
  );
}
