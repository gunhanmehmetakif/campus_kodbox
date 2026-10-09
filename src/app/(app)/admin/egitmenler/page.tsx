import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { Suspense } from "react";

import { CreateInstructorButton } from "@/components/admin/instructor-dialogs";
import { InstructorList } from "@/components/admin/instructor-list";
import { ListSkeleton } from "@/components/admin/list-skeleton";
import { firstParam, pageParam, statusParam, type SearchParams } from "@/components/admin/search-params";
import { FilterSelect, SearchBox } from "@/components/admin/url-filters";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { listInstructors } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Eğitmenler" };

async function InstructorsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() || undefined;
  const status = statusParam(params);
  const result = await listInstructors({ page: pageParam(params), q, status });
  const filtered = Boolean(q || status);

  return (
    <>
      {result.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={filtered ? "Eşleşen eğitmen yok" : "Henüz eğitmen hesabı yok"}
          description={
            filtered ? "Aramayı veya durum filtresini değiştirin." : "İlk eğitmen hesabını oluşturduğunuzda burada listelenir."
          }
        />
      ) : (
        <InstructorList items={result.items} />
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}

export default function AdminInstructorsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Eğitmenler"
        description="Eğitmen hesaplarını oluşturun ve yönetin."
        actions={<CreateInstructorButton />}
      />
      <Suspense fallback={null}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox param="q" label="Eğitmen ara" placeholder="Görünen ada göre ara" className="sm:w-80" />
          <FilterSelect
            param="durum"
            label="Durum"
            allLabel="Tüm durumlar"
            options={[
              { value: "active", label: "Aktif" },
              { value: "disabled", label: "Devre dışı" },
            ]}
          />
        </div>
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <InstructorsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
