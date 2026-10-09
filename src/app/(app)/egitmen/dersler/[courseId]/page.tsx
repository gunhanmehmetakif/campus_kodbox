import type { Metadata } from "next";
import { Archive, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentsTab } from "@/components/assignments/instructor/assignments-tab";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { ArchiveButton } from "@/components/courses/archive-button";
import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { CourseTabs, parseCourseTab } from "@/components/courses/course-tabs";
import { PostsTab } from "@/components/courses/posts-tab";
import { RosterTab, parseRosterFilter } from "@/components/courses/roster-tab";
import { first, isUuid } from "@/components/courses/utils";
import { Button } from "@/components/ui/button";
import { getMyCourse } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Ders" };

export default async function InstructorCoursePage({ params, searchParams }: PageProps<"/egitmen/dersler/[courseId]">) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(courseId)) notFound();

  const course = await getMyCourse(courseId);
  const tab = parseCourseTab(first(query.sekme));
  const archived = course.archivedAt !== null;
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? "1", 10) || 1);
  const filter = parseRosterFilter(first(query.filtre));
  const studentNo = first(query.numara)?.trim() || undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.name}
        description={`${course.code} · ${course.term.name}`}
        actions={
          <>
            {archived ? null : (
              <CourseFormDialog
                course={course}
                trigger={
                  <Button variant="outline" className="h-11">
                    <Pencil aria-hidden="true" />
                    Düzenle
                  </Button>
                }
              />
            )}
            <ArchiveButton courseId={course.id} archived={archived} />
          </>
        }
      />
      {archived ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-4 py-3 text-sm text-status-pending"
        >
          <Archive className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Bu ders arşivlenmiş. İçerik salt okunurdur; düzenlemek için dersi arşivden çıkarın.</p>
        </div>
      ) : null}
      {course.description ? <p className="max-w-prose text-sm text-muted-foreground">{course.description}</p> : null}

      <CourseTabs courseId={course.id} active={tab} />

      <Suspense key={`${tab}|${page}|${filter}|${studentNo ?? ""}`} fallback={<PageSkeleton variant="list" />}>
        {tab === "akis" ? (
          <PostsTab courseId={course.id} type="announcement" archived={archived} />
        ) : tab === "materyaller" ? (
          <PostsTab courseId={course.id} type="material" archived={archived} />
        ) : tab === "ogrenciler" ? (
          <RosterTab course={course} page={page} filter={filter} studentNo={studentNo} />
        ) : (
          <AssignmentsTab courseId={course.id} archived={archived} />
        )}
      </Suspense>
    </div>
  );
}
