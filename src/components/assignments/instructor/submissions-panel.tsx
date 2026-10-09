import { Download, Send, Users } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publishScoresAction } from "@/server/assignments/actions";
import { getSubmissionHistory, listSubmissions, type getAssignmentForInstructor } from "@/server/assignments/queries";
import { assignmentHref } from "./format";
import { SubmissionsTable } from "./submissions-table";

type Detail = Awaited<ReturnType<typeof getAssignmentForInstructor>>;

export type SubmissionFilter = "ungraded" | "missing" | "late" | "all";

export function parseSubmissionFilter(value: string | undefined, grading: boolean): SubmissionFilter {
  if (value === "ungraded" && grading) return value;
  if (value === "missing" || value === "late" || value === "all") return value;
  return grading ? "ungraded" : "all";
}

const FILTER_LABEL: Record<SubmissionFilter, string> = {
  ungraded: "Puanlanmamış",
  missing: "Teslim etmeyenler",
  late: "Geç",
  all: "Tümü",
};

const EMPTY_COPY: Record<SubmissionFilter, { title: string; description: string }> = {
  ungraded: { title: "Puanlanmamış teslim yok", description: "Tüm teslimler puanlanmış." },
  missing: { title: "Teslim etmeyen yok", description: "Listedeki herkes teslim etti." },
  late: { title: "Geç teslim yok", description: "Süresinden sonra teslim eden öğrenci yok." },
  all: { title: "Henüz öğrenci yok", description: "Dersin listesine öğrenci eklendiğinde burada görünür." },
};

type SubmissionsPanelProps = { assignment: Detail; filter: SubmissionFilter; page: number };

export async function SubmissionsPanel({ assignment, filter, page }: SubmissionsPanelProps) {
  const grading = assignment.maxScore !== null;
  const archived = assignment.course.archivedAt !== null;
  const result = await listSubmissions(assignment.id, { filter, page });
  const historyRows = result.items.filter((row) => row.submission && row.submission.historyCount > 1);
  const histories = Object.fromEntries(
    await Promise.all(
      historyRows.map(async (row) => [row.submission!.id, await getSubmissionHistory(row.submission!.id)] as const),
    ),
  );
  const unpublished = Math.max(0, assignment.counts.graded - assignment.counts.published);
  const chips = (["ungraded", "missing", "late", "all"] as const).filter((key) => key !== "ungraded" || grading);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Teslim filtresi" className="-mb-1 overflow-x-auto pb-1">
          <ul className="flex min-w-max gap-2">
            {chips.map((key) => (
              <li key={key}>
                <Link
                  href={`${assignmentHref(assignment.id, "teslimler")}&filtre=${key}`}
                  aria-current={key === filter ? "true" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                    key === filter ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                  )}
                >
                  {FILTER_LABEL[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-11">
            <a href={`/api/odevler/${assignment.id}/teslimler.csv`} download>
              <Download aria-hidden="true" />
              CSV indir
            </a>
          </Button>
          {grading && !archived ? (
            <ConfirmDialog
              trigger={
                <Button className="h-11" disabled={unpublished === 0}>
                  <Send aria-hidden="true" />
                  Puanları yayınla ({unpublished})
                </Button>
              }
              title="Puanları yayınla"
              description={<>{unpublished} puanlanmış teslim öğrencilere açılacak ve bildirim gidecek.</>}
              confirmLabel="Yayınla"
              successMessage="Puanlar yayınlandı."
              action={publishScoresAction}
              hiddenFields={{ assignmentId: assignment.id }}
            />
          ) : null}
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={Users} {...EMPTY_COPY[filter]} />
      ) : (
        <>
          <SubmissionsTable
            rows={result.items}
            histories={histories}
            maxScore={assignment.maxScore}
            penalty={{ type: assignment.latePenaltyType, value: assignment.latePenaltyValue }}
            editable={!archived}
          />
          <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
        </>
      )}
    </div>
  );
}
