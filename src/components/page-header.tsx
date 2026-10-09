import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Sayfa başlığı bandı.
 *
 *   <PageHeader title="Derslerim" description="2026-2027 Güz" actions={<Button>Ders oluştur</Button>} />
 *
 * Ders sayfası için (DESIGN.md · Düzen): `eyebrow` = <CourseCodeBadge/>, `size="lg"` (display 32),
 * `meta` = dönem; sekmeler başlığın altına `children` olarak verilir.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  size = "md",
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  size?: "md" | "lg";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 pb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
          <h1
            className={cn(
              "font-display font-bold tracking-heading text-pretty text-ink",
              size === "lg" ? "text-xl sm:text-2xl" : "text-xl",
            )}
          >
            {title}
          </h1>
          {description ? <p className="max-w-[68ch] text-sm text-ink-soft">{description}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-soft">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
