import { Skeleton } from "@/components/ui/skeleton";

/** Auth formları yüklenirken (oturum/okul okunurken) gösterilen iskelet. */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Yükleniyor">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
