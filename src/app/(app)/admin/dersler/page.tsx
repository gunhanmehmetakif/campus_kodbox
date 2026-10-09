import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Suspense } from "react";

import { ArchiveTermButton } from "@/components/admin/archive-term-button";
import { CourseList } from "@/components/admin/course-list";
import { ListSkeleton } from "@/components/admin/list-skeleton";
import { firstParam, pageParam, type SearchParams } from "@/components/admin/search-params";
import { FilterCheckbox, FilterSelect } from "@/components/admin/url-filters";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { listCoursesForAdmin, listTerms } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Dersler" };

async function CoursesContent({ searchParams }: { searchParams: SearchParams }) {
  const [params, terms] = await Promise.all([searchParams, listTerms()]);
  const requested = firstParam(params.donem);
  const term = terms.find((t) => t.id === requested) ?? terms.find((t) => t.isActive) ?? null;
  const archived = firstParam(params.arsiv) === "1";

  const result = await listCoursesForAdmin({ page: pageParam(params), termId: term?.id, archived });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterSelect
          param="donem"
          label="Dönem"
          options={terms.map((t) => ({ value: t.id, label: t.isActive ? `${t.name} (aktif)` : t.name }))}
          fallbackValue={term?.id}
          className="h-11 w-full sm:w-64 md:h-9"
        />
        <FilterCheckbox param="arsiv" label="Arşivlenenleri göster" />
        {term ? (
          <div className="sm:ml-auto">
            <ArchiveTermButton termId={term.id} termName={term.name} count={term.activeCourseCount} />
          </div>
        ) : null}
      </div>

      {terms.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Önce bir dönem tanımlayın"
          description="Dersler dönemlere bağlıdır. Dönemler sayfasından ilk dönemi ekleyin."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={archived ? "Arşivli ders yok" : "Bu dönemde ders yok"}
          description="Eğitmenler ders açtığında burada listelenir."
        />
      ) : (
        <CourseList items={result.items} />
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}

export default function AdminCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Dersler" description="Dönem bazında dersleri görüntüleyin ve toplu arşivleyin." />
      <Suspense fallback={<ListSkeleton />}>
        <CoursesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
