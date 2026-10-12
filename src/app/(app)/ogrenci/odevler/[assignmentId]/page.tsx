import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { isUuid } from "@/components/courses/utils";
import { studentAssignmentHref } from "@/components/student/utils";
import { getAssignmentForStudent } from "@/server/assignments/queries";

export const metadata: Metadata = { title: "Ödev" };

/** Legacy address (notification links): forwards to the assignment card in its course feed. */
export default function StudentAssignmentRedirect({ params }: PageProps<"/ogrenci/odevler/[assignmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <Forward params={params} />
    </Suspense>
  );
}

async function Forward({ params }: { params: PageProps<"/ogrenci/odevler/[assignmentId]">["params"] }) {
  const { assignmentId } = await params;
  if (!isUuid(assignmentId)) notFound();
  const a = await getAssignmentForStudent(assignmentId);
  return redirect(studentAssignmentHref(a.id, a.course.id));
}
