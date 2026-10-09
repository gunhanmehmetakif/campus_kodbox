"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

type PaginationProps = { page: number; pageSize: number; total: number };

/** Previous/next links using `?sayfa=`; other query parameters are preserved. */
export function Pagination(props: PaginationProps) {
  return (
    <Suspense fallback={null}>
      <PaginationLinks {...props} />
    </Suspense>
  );
}

function PaginationLinks({ page, pageSize, total }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0 || pageCount === 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("sayfa");
    else params.set("sayfa", String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {total} kayıttan {from}–{to} arası
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" className="h-11 sm:h-8">
            <Link href={hrefFor(page - 1)} rel="prev">
              <ChevronLeft aria-hidden="true" />
              Önceki
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="h-11 sm:h-8" disabled>
            <ChevronLeft aria-hidden="true" />
            Önceki
          </Button>
        )}
        <span className="text-sm text-muted-foreground" aria-current="page">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Button asChild variant="outline" className="h-11 sm:h-8">
            <Link href={hrefFor(page + 1)} rel="next">
              Sonraki
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="h-11 sm:h-8" disabled>
            Sonraki
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
