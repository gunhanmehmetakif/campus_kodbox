import type { Metadata } from "next";
import { Info, Users } from "lucide-react";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/admin/list-skeleton";
import { firstParam, pageParam, statusParam, type SearchParams } from "@/components/admin/search-params";
import { StudentList } from "@/components/admin/student-list";
import { FilterSelect, SearchBox } from "@/components/admin/url-filters";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { listStudents } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Öğrenciler" };

async function StudentsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const studentNo = firstParam(params.no)?.trim() || undefined;
  const status = statusParam(params);
  const result = await listStudents({ page: pageParam(params), studentNo, status });
  const filtered = Boolean(studentNo || status);

  return (
    <>
      {result.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? "Eşleşen öğrenci yok" : "Henüz kayıtlı öğrenci yok"}
          description={
            studentNo
              ? "Bu numarayla kayıtlı bir öğrenci bulunamadı. Numaranın tamamını yazdığınızdan emin olun."
              : filtered
                ? "Durum filtresini değiştirin."
                : "Öğrenciler kayıt olduğunda burada listelenir."
          }
        />
      ) : (
        <StudentList items={result.items} />
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}

export default function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Öğrenciler" description="Öğrenci hesaplarını görüntüleyin ve gerekirse devre dışı bırakın." />
      <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Numaralar KVKK gereği maskeli gösterilir. Arama yalnız tam numarayla yapılır, kısmi numarayla aranamaz.
        </span>
      </p>
      <Suspense fallback={null}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox
            param="no"
            label="Öğrenci numarasıyla ara (tam numara)"
            placeholder="Öğrenci numarasıyla ara (tam numara)"
            inputMode="numeric"
            className="sm:w-96"
          />
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
        <StudentsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
