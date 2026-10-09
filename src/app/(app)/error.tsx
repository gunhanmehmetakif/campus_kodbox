"use client";

import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Bir şeyler ters gitti"
      description="Sayfa yüklenemedi. Tekrar deneyebilirsiniz."
      action={
        <Button className="h-11" onClick={reset}>
          Tekrar dene
        </Button>
      }
    />
  );
}
