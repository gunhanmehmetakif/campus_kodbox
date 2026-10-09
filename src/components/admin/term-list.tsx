import { CheckCircle2 } from "lucide-react";

import { formatDay } from "@/components/admin/format";
import { SetActiveTermButton, TermFormDialog } from "@/components/admin/term-dialogs";
import { Card } from "@/components/ui/card";
import type { listTerms } from "@/server/admin/queries";

type Term = Awaited<ReturnType<typeof listTerms>>[number];

function ActiveBadge() {
  return (
    <span className="inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full bg-status-graded-bg px-2.5 text-xs font-medium text-status-graded">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Aktif dönem
    </span>
  );
}

function dateRange(t: Term) {
  if (!t.startsOn && !t.endsOn) return "Tarih belirtilmemiş";
  return `${formatDay(t.startsOn, "?")} – ${formatDay(t.endsOn, "?")}`;
}

/** Card list that works on both mobile and desktop (few rows, rich actions). */
export function TermList({ items }: { items: Term[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t.id}>
          <Card className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-base font-medium">{t.name}</p>
                {t.isActive ? <ActiveBadge /> : null}
              </div>
              <p className="text-sm text-muted-foreground">{dateRange(t)}</p>
              <p className="text-xs text-muted-foreground">
                {t.courseCount} ders · {t.activeCourseCount} arşivlenmemiş
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TermFormDialog term={{ id: t.id, name: t.name, startsOn: t.startsOn, endsOn: t.endsOn }} />
              {t.isActive ? null : <SetActiveTermButton id={t.id} name={t.name} />}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
