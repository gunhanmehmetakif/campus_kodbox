import type { Metadata } from "next";
import { Archive } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { first, isUuid } from "@/components/courses/utils";
import { CourseFeed } from "@/components/student/course-feed";
import { FeedFilterChips, parseFeedFilter } from "@/components/student/feed-filters";
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
  const filter = parseFeedFilter(first(query.filtre), first(query.sekme));
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? "1", 10) || 1);
  const odevParam = first(query.odev);
  const odev = odevParam && isUuid(odevParam) ? odevParam : undefined;

  return (
    <div className="space-y-5">
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

      <FeedFilterChips courseId={course.id} active={filter} />

      <Suspense key={`${filter}|${page}|${odev ?? ""}`} fallback={<PageSkeleton variant="list" />}>
        <CourseFeed courseId={course.id} filter={filter} page={page} odev={odev} />
      </Suspense>
    </div>
  );
}
