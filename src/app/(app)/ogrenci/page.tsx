import type { Metadata } from "next";
import { BookOpen, CalendarClock, Megaphone } from "lucide-react";

import { DashboardSection } from "@/components/common/dashboard-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Panel" };

export default function StudentHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Panel" description="Yaklaşan teslimleriniz ve derslerinizi buradan takip edin." />
      <DashboardSection title="Yaklaşan teslimler">
        <EmptyState
          icon={CalendarClock}
          title="Yaklaşan teslim yok"
          description="Ödevler eklendikçe en yakın tarihli olan üstte görünür."
        />
      </DashboardSection>
      <DashboardSection title="Derslerim">
        <EmptyState
          icon={BookOpen}
          title="Henüz bir derse eklenmediniz"
          description="Eğitmeniniz sizi bir derse eklediğinde ders burada görünür."
        />
      </DashboardSection>
      <DashboardSection title="Son duyurular">
        <EmptyState icon={Megaphone} title="Duyuru yok" description="Derslerinizdeki duyurular burada listelenir." />
      </DashboardSection>
    </div>
  );
}
