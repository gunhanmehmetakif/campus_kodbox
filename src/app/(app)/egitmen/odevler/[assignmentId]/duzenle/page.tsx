import type { Metadata } from "next";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentEditor } from "@/components/assignments/instructor/assignment-editor";
import { assignmentHref } from "@/components/assignments/instructor/format";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { isUuid } from "@/components/courses/utils";
import { Button } from "@/components/ui/button";
import { getAssignmentForInstructor } from "@/server/assignments/queries";

export const metadata: Metadata = { title: "Ödevi düzenle" };

type Props = PageProps<"/egitmen/odevler/[assignmentId]/duzenle">;

export default function EditAssignmentPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <EditAssignment params={params} />
    </Suspense>
  );
}

async function EditAssignment({ params }: Pick<Props, "params">) {
  const { assignmentId } = await params;
  if (!isUuid(assignmentId)) notFound();
  const a = await getAssignmentForInstructor(assignmentId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={assignmentHref(a.id)}>
          <ArrowLeft aria-hidden="true" />
          {a.course.code} · {a.title}
        </Link>
      </Button>
      <PageHeader title="Ödevi düzenle" />
      {a.course.archivedAt ? (
        <EmptyState icon={Lock} title="Arşivlenmiş ders değiştirilemez." description="Önce dersi arşivden çıkarın." />
      ) : (
        <AssignmentEditor
          courseId={a.course.id}
          assignment={{
            id: a.id,
            title: a.title,
            bodyMd: a.bodyMd,
            links: a.links,
            status: a.status,
            submissionType: a.submissionType,
            allowAnyLink: a.allowAnyLink,
            dueAt: a.dueAt,
            lateAllowed: a.lateAllowed,
            lateUntil: a.lateUntil,
            latePenaltyType: a.latePenaltyType,
            latePenaltyValue: a.latePenaltyValue,
            maxScore: a.maxScore,
          }}
        />
      )}
    </div>
  );
}
