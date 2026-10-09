import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Dönemler" };

export default function AdminTermsPage() {
  return (
    <PlaceholderPage
      title="Dönemler"
      description="Aktif dönemi seçin ve dönem sonunda dersleri arşivleyin."
      emptyTitle="Henüz dönem tanımlı değil"
      emptyDescription="İlk dönemi oluşturduğunuzda burada görünür."
      icon={CalendarRange}
    />
  );
}
