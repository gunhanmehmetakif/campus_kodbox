import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCourseAssignments } from "@/server/assignments/queries";
import { assignmentHref } from "./format";

type AssignmentSummary = Awaited<ReturnType<typeof listCourseAssignments>>[number];

export function newAssignmentHref(courseId: string): string {
  return `/egitmen/dersler/${courseId}/odev/yeni`;
}

/** "Ödevler" tab of the instructor course page. */
export async function AssignmentsTab({ courseId, archived }: { courseId: string; archived: boolean }) {
  const assignments = await listCourseAssignments(courseId);

  const newButton = archived ? null : (
    <Button asChild className="h-11">
      <Link href={newAssignmentHref(courseId)}>
        <Plus aria-hidden="true" />
        Yeni ödev
      </Link>
    </Button>
  );

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Henüz ödev yok"
        description="Ödev oluşturup yayınladığınızda kayıtlı öğrencilere bildirim gider."
        action={newButton ?? undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {newButton ? <div className="flex sm:justify-end">{newButton}</div> : null}
      <ul className="space-y-3">
        {assignments.map((assignment) => (
          <li key={assignment.id}>
            <AssignmentCard assignment={assignment} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: AssignmentSummary }) {
  const draft = assignment.status === "draft";
  const { counts } = assignment;
  const tab = !draft && counts.submitted > 0 ? "teslimler" : "detay";
  return (
    <Link
      href={assignmentHref(assignment.id, tab)}
      className="block space-y-2 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        {draft ? <Badge variant="secondary">Taslak</Badge> : null}
        <h3 className="font-heading text-lg leading-snug font-medium break-words">{assignment.title}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          Son teslim:
          <DeadlineCountdown dueAt={assignment.dueAt} />
        </span>
        {draft ? (
          <span className="text-muted-foreground">Yayınlanmadı</span>
        ) : assignment.submissionType === "none" ? (
          <span className="text-muted-foreground">Teslim gerekmiyor</span>
        ) : (
          <span className="text-muted-foreground">
            {counts.submitted}/{counts.roster} teslim
            {counts.late > 0 ? ` · ${counts.late} geç` : ""}
            {assignment.maxScore !== null ? ` · ${counts.graded} puanlandı` : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
