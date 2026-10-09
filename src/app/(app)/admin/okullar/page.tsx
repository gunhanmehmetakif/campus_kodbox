import type { Metadata } from "next";
import { School } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Okullar" };

export default function AdminSchoolsPage() {
  return (
    <PlaceholderPage
      title="Okullar"
      description="Okul mail alan adları ve numara kuralları."
      emptyTitle="Henüz okul tanımlı değil"
      emptyDescription="Okul eklediğinizde burada listelenir."
      icon={School}
    />
  );
}
