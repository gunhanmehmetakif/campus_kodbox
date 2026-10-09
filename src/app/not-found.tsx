import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <EmptyState
        className="w-full"
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa yok ya da taşınmış olabilir."
        action={
          <Link href="/" className={cn(buttonVariants(), "h-11 px-4")}>
            Ana sayfaya dön
          </Link>
        }
      />
    </main>
  );
}
