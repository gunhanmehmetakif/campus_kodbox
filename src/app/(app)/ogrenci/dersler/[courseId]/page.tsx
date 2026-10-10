import type { Metadata } from "next";
import { Archive } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { first, isUuid } from "@/components/courses/utils";
import { AssignmentsTab } from "@/components/student/assignments-tab";
import {
  StudentCourseTabs,
  parseAssignmentFilter,
  parseStudentTab,
} from "@/components/student/course-tabs";
import { FeedTab } from "@/components/student/feed-tab";
import { getStudentCourse } from "@/server/student/queries";

export const metadata: Metadata = { title: "Ders" };

export default function StudentCoursePage({ params, searchParams }: PageProps<"/ogrenci/dersler/[courseId]">) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <CourseContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CourseContent({
  params,
  searchParams,
}: {
  params: PageProps<"/ogrenci/dersler/[courseId]">["params"];
  searchParams: PageProps<"/ogrenci/dersler/[courseId]">["searchParams"];
}) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(courseId)) notFound();

  const course = await getStudentCourse(courseId);
  const tab = parseStudentTab(first(query.sekme));
  const filter = parseAssignmentFilter(first(query.filtre));
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${course.code} · ${course.name}`}
        description={[course.instructorName, course.termName].filter(Boolean).join(" · ")}
      />
      {course.archived ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-4 py-3 text-sm text-status-pending"
        >
          <Archive className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Arşivlendi, salt okunur.</p>
        </div>
      ) : null}
      {course.description ? <p className="max-w-prose text-sm text-muted-foreground">{course.description}</p> : null}

      <StudentCourseTabs courseId={course.id} active={tab} />

      <Suspense key={`${tab}|${page}|${filter}`} fallback={<PageSkeleton variant="list" />}>
        {tab === "odevler" ? (
          <AssignmentsTab courseId={course.id} filter={filter} />
        ) : (
          <FeedTab courseId={course.id} tab={tab} page={page} />
        )}
      </Suspense>
    </div>
  );
}
