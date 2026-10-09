"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ROLE_ROOTS, SEGMENT_LABELS } from "./nav";

/**
 * Üst bar breadcrumb'ı. URL'den otomatik üretilir (SEGMENT_LABELS).
 * Dinamik segmentler (ders id'si vb.) için sayfada etiket bildirin:
 *
 *   <BreadcrumbLabel segment={course.id} label={course.code} />
 *
 * Etiket bildirilmemiş dinamik segment, bir önceki segmentin tekil adıyla gösterilir
 * ("dersler/…" → "Ders").
 */

type Registry = { labels: Record<string, string>; set: (segment: string, label: string | null) => void };

const BreadcrumbContext = createContext<Registry | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const set = useCallback((segment: string, label: string | null) =>
    setLabels((prev) => {
      if (label === null) {
        if (!(segment in prev)) return prev;
        const next = { ...prev };
        delete next[segment];
        return next;
      }
      return prev[segment] === label ? prev : { ...prev, [segment]: label };
    }), []);
  const value = useMemo(() => ({ labels, set }), [labels, set]);
  return <BreadcrumbContext value={value}>{children}</BreadcrumbContext>;
}

/** Sayfadan dinamik segment etiketi bildirir (görsel çıktı üretmez). */
export function BreadcrumbLabel({ segment, label }: { segment: string; label: string }) {
  const registry = use(BreadcrumbContext);
  const set = registry?.set;
  useEffect(() => {
    set?.(segment, label);
    return () => set?.(segment, null);
  }, [set, segment, label]);
  return null;
}

const SINGULAR: Record<string, string> = {
  dersler: "Ders",
  odevler: "Ödev",
  materyaller: "Materyal",
  duyurular: "Duyuru",
  egitmenler: "Eğitmen",
  ogrenciler: "Öğrenci",
  okullar: "Okul",
  donemler: "Dönem",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const registry = use(BreadcrumbContext);
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const decoded = decodeURIComponent(segment);
    let label =
      registry?.labels[decoded] ??
      (i === 0 && ROLE_ROOTS.has(decoded) ? "Panel" : SEGMENT_LABELS[decoded]);
    if (!label) label = SINGULAR[segments[i - 1] ?? ""] ?? "Ayrıntı";
    return { href, label, mono: Boolean(registry?.labels[decoded] && /^[A-ZÇĞİÖŞÜ]{2,}\d/.test(registry.labels[decoded]!)) };
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Konum" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.href} className={cn("flex min-w-0 items-center gap-1", !last && "hidden sm:flex")}>
              {last ? (
                <span aria-current="page" className={cn("truncate font-medium text-ink", crumb.mono && "font-mono text-label")}>
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href}
                    className={cn(
                      "truncate rounded-sm text-ink-soft transition-colors hover:text-ink",
                      crumb.mono && "font-mono text-label",
                    )}
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-line-strong" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
