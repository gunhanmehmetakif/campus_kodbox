import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback shaped like AuthCard while page params/config resolve. */
export function AuthCardSkeleton() {
  return (
    <Card
      className="w-full gap-5 py-6 shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]"
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      <CardHeader className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}
