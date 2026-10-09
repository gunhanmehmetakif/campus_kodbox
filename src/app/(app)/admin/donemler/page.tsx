import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/admin/list-skeleton";
import { TermFormDialog } from "@/components/admin/term-dialogs";
import { TermList } from "@/components/admin/term-list";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { listTerms } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Dönemler" };

async function TermsContent() {
  const terms = await listTerms();
  if (terms.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Henüz dönem yok"
        description="Dersler dönemlere bağlıdır. İlk dönemi ekleyip aktif yapın."
      />
    );
  }
  return <TermList items={terms} />;
}

export default function AdminTermsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dönemler" description="Akademik dönemleri yönetin, aktif dönemi seçin." actions={<TermFormDialog />} />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <TermsContent />
      </Suspense>
    </div>
  );
}
