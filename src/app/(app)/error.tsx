"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Bir şeyler ters gitti"
      description="Sayfa yüklenemedi. Tekrar deneyebilirsiniz."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button className="h-11" onClick={reset}>
            Tekrar dene
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
            Panele dön
          </Link>
        </div>
      }
    />
  );
}
