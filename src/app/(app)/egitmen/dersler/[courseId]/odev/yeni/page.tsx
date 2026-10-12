import type { Metadata } from "next";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentEditor } from "@/components/assignments/instructor/assignment-editor";
import { daysFromNow } from "@/components/assignments/instructor/format";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { isUuid } from "@/components/courses/utils";
import { Button } from "@/components/ui/button";
import { getMyCourse } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Yeni ödev" };

type Props = PageProps<"/egitmen/dersler/[courseId]/odev/yeni">;

export default function NewAssignmentPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <NewAssignment params={params} />
    </Suspense>
  );
}

async function NewAssignment({ params }: Pick<Props, "params">) {
  const { courseId } = await params;
  if (!isUuid(courseId)) notFound();
  const course = await getMyCourse(courseId);
  const back = `/egitmen/dersler/${course.id}?filtre=odev`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={back}>
          <ArrowLeft aria-hidden="true" />
          {course.code} · {course.name}
        </Link>
      </Button>
      <PageHeader title="Yeni ödev" />
      {course.archivedAt ? (
        <EmptyState icon={Lock} title="Arşivlenmiş ders değiştirilemez." description="Önce dersi arşivden çıkarın." />
      ) : (
        <AssignmentEditor courseId={course.id} defaultDue={daysFromNow(7)} />
      )}
    </div>
  );
}
