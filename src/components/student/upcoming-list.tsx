import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";

import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import type { UpcomingItem } from "@/server/student/queries";
import { studentAssignmentHref } from "./utils";

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Bekleyen teslim yok"
        description="Yeni ödevler burada en yakın tarihe göre listelenir."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const late = item.state === "late";
        return (
          <li key={item.assignmentId}>
            <Link
              href={studentAssignmentHref(item.assignmentId, item.course.id)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                late && "border-l-4 border-l-status-late",
              )}
            >
              <span className="w-16 shrink-0 truncate rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium text-muted-foreground">
                {item.course.code}
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block font-medium break-words">{item.title}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {late ? <StatusBadge status="late" label="Geç teslim" /> : null}
                  <DeadlineCountdown dueAt={item.dueAt} />
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
