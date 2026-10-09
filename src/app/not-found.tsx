import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-4 text-center">
      <Logo size="lg" />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-8 py-10">
        <span className="flex size-11 items-center justify-center rounded-xl bg-paper text-ink-soft">
          <CompassIcon className="size-5" aria-hidden />
        </span>
        <p className="font-mono text-label text-ink-soft">404</p>
        <h1 className="text-xl font-bold">Sayfa bulunamadı</h1>
        <p className="max-w-[40ch] text-sm text-ink-soft">
          Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol et veya ana sayfaya dön.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>
    </main>
  );
}
