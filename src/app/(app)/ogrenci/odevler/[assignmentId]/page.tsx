import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Ödev" };

export default function StudentAssignmentPage() {
  return (
    <PlaceholderPage
      title="Ödev"
      description="Ödev açıklaması ve teslim kartı."
      emptyTitle="Ödev bilgisi yüklenemedi"
      emptyDescription="Ödev detayı F4 aşamasında eklenecek."
      icon={ClipboardList}
    />
  );
}
