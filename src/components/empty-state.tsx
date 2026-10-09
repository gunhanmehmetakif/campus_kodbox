import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Boş durum (DESIGN.md: boş durumlar eyleme çağırır).
 *
 *   <EmptyState
 *     icon={ClipboardList}
 *     title="Henüz ödev yok"
 *     description="Öğrencilerin görmesi için ilk ödevi oluştur."
 *     action={<Button asChild><Link href=…>Ödev oluştur</Link></Button>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface text-center",
        size === "md" ? "gap-3 px-6 py-12" : "gap-2 px-4 py-8",
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-xl bg-paper text-ink-soft",
            size === "md" ? "mb-1 size-11" : "size-9",
          )}
        >
          <Icon className={size === "md" ? "size-5" : "size-4"} strokeWidth={1.75} />
        </div>
      ) : null}
      <p className={cn("font-display font-semibold tracking-heading text-ink", size === "md" ? "text-base" : "text-sm")}>
        {title}
      </p>
      {description ? <p className="max-w-[44ch] text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
