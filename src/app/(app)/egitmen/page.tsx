import type { Metadata } from "next";
import { BookOpen, ClipboardCheck } from "lucide-react";

import { DashboardSection } from "@/components/common/dashboard-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Panel" };

export default function InstructorHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Panel" description="Puanlanmayı bekleyen teslimler ve derslerinizin özeti." />
      <DashboardSection title="Puanlanmayı bekleyenler">
        <EmptyState
          icon={ClipboardCheck}
          title="Bekleyen teslim yok"
          description="Öğrenciler ödev teslim ettikçe burada görünür."
        />
      </DashboardSection>
      <DashboardSection title="Derslerim">
        <EmptyState
          icon={BookOpen}
          title="Henüz ders açmadınız"
          description="Yeni ders oluşturduğunuzda öğrenci numaralarını yapıştırarak ekleyebilirsiniz."
        />
      </DashboardSection>
    </div>
  );
}
