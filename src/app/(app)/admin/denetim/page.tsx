import type { Metadata } from "next";
import { History } from "lucide-react";
import { Suspense } from "react";

import { AuditList } from "@/components/admin/audit-list";
import { ListSkeleton } from "@/components/admin/list-skeleton";
import { firstParam, pageParam, type SearchParams } from "@/components/admin/search-params";
import { FilterSelect } from "@/components/admin/url-filters";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { AUDIT_ACTION_OPTIONS, listAuditLogs } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Denetim kaydı" };

async function AuditContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const action = firstParam(params.islem) || undefined;
  const result = await listAuditLogs({ page: pageParam(params), action });

  return (
    <>
      {result.items.length === 0 ? (
        <EmptyState
          icon={History}
          title={action ? "Bu işlem için kayıt yok" : "Henüz kayıt yok"}
          description={action ? "Başka bir işlem türü seçin." : "Yapılan işlemler burada izlenir."}
        />
      ) : (
        <AuditList items={result.items} />
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}

export default function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Denetim kaydı" description="Yönetici ve sistem işlemlerinin kaydı." />
      <Suspense fallback={null}>
        <FilterSelect param="islem" label="İşlem türü" allLabel="Tüm işlemler" options={AUDIT_ACTION_OPTIONS} className="h-11 w-full sm:w-72 md:h-9" />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <AuditContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
