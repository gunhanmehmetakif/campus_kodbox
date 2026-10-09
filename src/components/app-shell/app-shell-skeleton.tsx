import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Oturum okunurken gösterilen kabuk iskeleti (statik kabuğun parçası; anında görünür).
 * AppShell ile birebir aynı ölçüler → yerleşim kayması olmaz.
 */
export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh bg-paper" aria-busy="true" aria-label="Yükleniyor">
      <aside className="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center px-5">
          <Logo />
        </div>
        <div className="flex flex-col gap-2 px-3 pt-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-sidebar">
        <div className="h-14 border-b border-line" />
        <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 sm:py-8">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

/** Sayfa içeriği iskeleti (rol klasörlerindeki loading.tsx'ler kullanır; <main> içine oturur). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Yükleniyor">
      <div className="flex flex-col gap-3 pb-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
