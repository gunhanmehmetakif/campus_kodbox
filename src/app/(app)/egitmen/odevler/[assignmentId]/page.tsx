import type { Metadata } from "next";
import { ArrowLeft, ClipboardList, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentDetail } from "@/components/assignments/instructor/assignment-detail";
import { AssignmentTabs, parseAssignmentTab } from "@/components/assignments/instructor/assignment-tabs";
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
  const tab = parseAssignmentTab(first(query.sekme)) ?? (!draft && a.counts.submitted > 0 ? "teslimler" : "detay");
  const filter = parseSubmissionFilter(first(query.filtre), grading);
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={`/egitmen/dersler/${a.course.id}?sekme=odevler`}>
          <ArrowLeft aria-hidden="true" />
          {a.course.code} · {a.course.name}
        </Link>
      </Button>
      <PageHeader
        title={a.title}
        description={draft ? "Taslak: öğrenciler henüz görmüyor." : undefined}
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

      <AssignmentTabs assignmentId={a.id} active={tab} />

      {tab === "detay" ? (
        <AssignmentDetail assignment={a} />
      ) : draft ? (
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
    </div>
  );
}
