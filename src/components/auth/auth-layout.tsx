import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

import { Tessera } from "./tessera";

/**
 * Auth ekranları düzeni (DESIGN.md): iki sütun.
 * - Sol: --ink zeminde mozaik tesserası deseni + tek cümle. Mobilde gizlenir.
 * - Sağ: form.
 *
 * src/app/(auth)/layout.tsx bu çerçeveyi kullanır; sayfalar sadece <AuthHeader> + formu render eder.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-tessera text-tessera-fg lg:flex lg:flex-col lg:justify-between">
        <Tessera />
        <div className="relative z-10 p-10">
          <Link href="/" className="inline-block rounded-md font-display text-xl font-bold tracking-heading" aria-label="Kodbox ana sayfa">
            <span className="text-tessera-laurel">k</span>odbox
          </Link>
        </div>
        <div className="relative z-10 flex flex-col gap-4 p-10 pb-12">
          <p className="max-w-[18ch] font-display text-2xl leading-[1.12] font-bold tracking-heading text-balance xl:text-3xl">
            Derslerin, ödevlerin, teslimlerin — tek yerde.
          </p>
          <p className="max-w-[40ch] text-sm text-tessera-fg/70">
            Ne zaman neyi teslim etmen gerektiğini tek bakışta gör.
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="rounded-md font-display text-lg font-bold tracking-heading text-ink lg:invisible" aria-label="Kodbox ana sayfa">
            <span className="text-laurel">k</span>odbox
          </Link>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:px-8 sm:pt-0">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Auth sayfası başlığı. */
export function AuthHeader({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-col gap-2", className)}>
      <h1 className="font-display text-xl font-bold tracking-heading text-ink">{title}</h1>
      {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
    </div>
  );
}

/** Formun altındaki "veya" ayracı (PLAN.md §2.1). */
export function AuthDivider({ children = "veya" }: { children?: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-ink-soft" role="separator">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
