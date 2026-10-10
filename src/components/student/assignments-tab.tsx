import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardList, Star } from "lucide-react";

import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { listStudentCourseAssignments, type StudentAssignmentListItem } from "@/server/student/queries";
import { AssignmentFilterChips, type AssignmentFilter } from "./course-tabs";
import { formatShortDateTime, studentAssignmentHref } from "./utils";

const EMPTY: Record<AssignmentFilter, { icon: typeof ClipboardList; title: string; description: string }> = {
  bekleyen: {
    icon: CheckCircle2,
    title: "Bekleyen ödev yok",
    description: "Teslim etmediğiniz ödevler burada listelenir.",
  },
  teslim: {
    icon: ClipboardList,
    title: "Teslim edilen ödev yok",
    description: "Teslim ettiğiniz ve puanı henüz yayınlanmamış ödevler burada görünür.",
  },
  puan: {
    icon: Star,
    title: "Puanlanmış ödev yok",
    description: "Eğitmeniniz puanları yayınladığında burada görünür.",
  },
};

export async function AssignmentsTab({ courseId, filter }: { courseId: string; filter: AssignmentFilter }) {
  const items = await listStudentCourseAssignments(courseId, { filter });
  const empty = EMPTY[filter];

  return (
    <div className="space-y-4">
      <AssignmentFilterChips courseId={courseId} active={filter} />
      {items.length === 0 ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={studentAssignmentHref(item.id)}
                className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block font-medium break-words">{item.title}</span>
                  <AssignmentState item={item} />
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignmentState({ item }: { item: StudentAssignmentListItem }) {
  if (item.result) {
    const { score, maxScore } = item.result;
    const label = score === null ? "Puanlandı" : maxScore === null ? `${score}` : `${score} / ${maxScore}`;
    return (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge status="graded" label={label} />
      </span>
    );
  }

  if (item.submittedAt) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status="submitted"
          label={`Teslim edildi · ${formatShortDateTime(item.submittedAt)}`}
        />
        {item.isLate ? <StatusBadge status="late" label="Geç" /> : null}
      </span>
    );
  }

  switch (item.window.state) {
    case "open":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status="pending" label="Açık" />
          <DeadlineCountdown dueAt={item.dueAt} />
        </span>
      );
    case "late":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status="late" label="Geç teslim" />
          <DeadlineCountdown dueAt={item.dueAt} />
        </span>
      );
    case "closed":
      return <StatusBadge status="late" label="Süre doldu" />;
    case "no_submission":
      return <Badge variant="secondary">Teslim gerekmiyor</Badge>;
  }
}
