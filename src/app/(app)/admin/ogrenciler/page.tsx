import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Öğrenciler" };

export default function AdminStudentsPage() {
  return (
    <PlaceholderPage
      title="Öğrenciler"
      description="Numaralar maskeli gösterilir."
      emptyTitle="Kayıtlı öğrenci yok"
      emptyDescription="Öğrenciler kayıt oldukça burada listelenir."
      icon={Users}
    />
  );
}
