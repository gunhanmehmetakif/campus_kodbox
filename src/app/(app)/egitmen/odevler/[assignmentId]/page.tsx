import type { Metadata } from "next";
import { ArrowLeft, ChevronDown, ClipboardList, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentDetail } from "@/components/assignments/instructor/assignment-detail";
import { submissionCounts } from "@/components/assignments/instructor/assignment-feed-card";
import { formatShort } from "@/components/assignments/instructor/format";
import { DeleteAssignmentButton } from "@/components/assignments/instructor/delete-assignment-button";
import { SubmissionsPanel, parseSubmissionFilter } from "@/components/assignments/instructor/submissions-panel";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { first, isUuid } from "@/components/courses/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAssignmentForInstructor } from "@/server/assignments/queries";

export const metadata: Metadata = { title: "Ödev" };

type Props = PageProps<"/egitmen/odevler/[assignmentId]">;

export default function InstructorAssignmentPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <AssignmentView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AssignmentView({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ assignmentId }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(assignmentId)) notFound();

  const a = await getAssignmentForInstructor(assignmentId);
  const archived = a.course.archivedAt !== null;
  const draft = a.status === "draft";
  const grading = a.maxScore !== null;
  const showSubmissions = !draft && a.submissionType === "link";
  const filter = parseSubmissionFilter(first(query.filtre), grading);
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? "1", 10) || 1);

  const unpublished = Math.max(0, a.counts.graded - a.counts.published);
  const summary = [
    draft ? "Taslak: öğrenciler henüz görmüyor" : null,
    !draft && a.submissionType === "link" ? submissionCounts(a) : null,
    !draft && a.maxScore !== null && unpublished > 0 ? `${unpublished} yayınlanmadı` : null,
    a.dueAt ? `Son teslim ${formatShort(a.dueAt)}` : "Süresiz",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={`/egitmen/dersler/${a.course.id}?filtre=odev`}>
          <ArrowLeft aria-hidden="true" />
          {a.course.code} · {a.course.name}
        </Link>
      </Button>
      <PageHeader
        title={a.title}
        description={summary.join(" · ")}
        actions={
          archived ? null : (
            <>
              {draft ? <Badge variant="secondary">Taslak</Badge> : null}
              <Button asChild variant="outline" className="h-11">
                <Link href={`/egitmen/odevler/${a.id}/duzenle`}>
                  <Pencil aria-hidden="true" />
                  Düzenle
                </Link>
              </Button>
              <DeleteAssignmentButton
                assignmentId={a.id}
                title={a.title}
                courseId={a.course.id}
                submittedCount={a.counts.submitted}
              />
            </>
          )
        }
      />

      {draft ? (
        <EmptyState
          icon={ClipboardList}
          title="Ödev henüz yayınlanmadı"
          description="Yayınladığınızda öğrenciler teslim edebilir ve teslimler burada listelenir."
        />
      ) : a.submissionType === "none" ? (
        <EmptyState
          icon={ClipboardList}
          title="Bu ödev için teslim gerekmiyor"
          description="Teslim türü “teslim gerekmiyor” olduğundan burada listelenecek bir şey yok."
        />
      ) : (
        <Suspense key={`${filter}|${page}`} fallback={<PageSkeleton variant="table" />}>
          <SubmissionsPanel assignment={a} filter={filter} page={page} />
        </Suspense>
      )}

      <details open={!showSubmissions} className="group rounded-xl border bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Ödev açıklaması
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t p-4">
          <AssignmentDetail assignment={a} />
        </div>
      </details>
    </div>
  );
}
