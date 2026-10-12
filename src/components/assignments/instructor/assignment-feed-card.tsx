import { ClipboardList, Pencil } from "lucide-react";
import Link from "next/link";

import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssignmentSummary } from "@/server/assignments/queries";
import { assignmentHref } from "./format";

/** One-line submission counters: `18/40 teslim · 6 puanlanmadı · 2 geç`. */
export function submissionCounts(a: AssignmentSummary): string {
  const { counts } = a;
  const parts = [`${counts.submitted}/${counts.roster} teslim`];
  const ungraded = Math.max(0, counts.submitted - counts.graded);
  if (a.maxScore !== null && ungraded > 0) parts.push(`${ungraded} puanlanmadı`);
  if (counts.late > 0) parts.push(`${counts.late} geç`);
  return parts.join(" · ");
}

/** Assignment entry of the instructor course feed. */
export function AssignmentFeedCard({ assignment, archived }: { assignment: AssignmentSummary; archived: boolean }) {
  const draft = assignment.status === "draft";
  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <ClipboardList aria-hidden="true" />
            Ödev
          </Badge>
          {draft ? <Badge variant="secondary">Taslak</Badge> : null}
        </div>
        <h3 className="font-heading text-lg leading-snug font-medium break-words">{assignment.title}</h3>
      </header>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Son teslim:
          <DeadlineCountdown dueAt={assignment.dueAt} />
        </span>
        {draft ? (
          <span>Yayınlanmadı</span>
        ) : assignment.submissionType === "none" ? (
          <span>Teslim gerekmiyor</span>
        ) : (
          <span>{submissionCounts(assignment)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {draft ? null : (
          <Button asChild className="h-11">
            <Link href={assignmentHref(assignment.id)}>Teslimleri aç</Link>
          </Button>
        )}
        {archived ? null : (
          <Button asChild variant="outline" className="h-11">
            <Link href={`/egitmen/odevler/${assignment.id}/duzenle`}>
              <Pencil aria-hidden="true" />
              Düzenle
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
