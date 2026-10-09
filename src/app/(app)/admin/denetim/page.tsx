import type { Metadata } from "next";
import { History } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Denetim kaydı" };

export default function AdminAuditPage() {
  return (
    <PlaceholderPage
      title="Denetim kaydı"
      description="Yönetici ve sistem işlemlerinin kaydı."
      emptyTitle="Henüz kayıt yok"
      emptyDescription="Yapılan işlemler burada izlenir."
      icon={History}
    />
  );
}
