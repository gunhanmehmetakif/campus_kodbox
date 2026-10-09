import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Ödev" };

export default function InstructorAssignmentPage() {
  return (
    <PlaceholderPage
      title="Ödev"
      description="Ödev detayı ve teslimler."
      emptyTitle="Henüz teslim yok"
      emptyDescription="Öğrenciler teslim ettikçe tabloda listelenir."
      icon={ClipboardList}
    />
  );
}
