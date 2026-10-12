import Link from "next/link";
import { ArrowLeft, ChevronRight, History } from "lucide-react";

import { DashboardSection } from "@/components/common/dashboard-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { getStudentDashboard, listPastCourses } from "@/server/student/queries";
import { AnnouncementsList } from "./announcements-list";
import { CourseCards, CoursesEmpty } from "./course-cards";
import { UpcomingList } from "./upcoming-list";

export async function StudentDashboard() {
  const { upcoming, courses, announcements, pastCourseCount } = await getStudentDashboard();

  return (
    <div className="space-y-8">
      <PageHeader title="Panel" />
      <DashboardSection title="Yaklaşan teslimler">
        <UpcomingList items={upcoming} />
      </DashboardSection>
      <DashboardSection title="Derslerim">
        {courses.length === 0 ? <CoursesEmpty /> : <CourseCards courses={courses} />}
      </DashboardSection>
      <DashboardSection title="Son duyurular">
        <AnnouncementsList items={announcements} />
      </DashboardSection>
      {pastCourseCount > 0 ? (
        <Link
          href="/ogrenci?gecmis=1"
          className="flex min-h-11 items-center justify-between gap-2 rounded-xl border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span className="inline-flex items-center gap-2">
            <History className="size-4 text-muted-foreground" aria-hidden="true" />
            Geçmiş dersler ({pastCourseCount})
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export async function PastCourses() {
  const courses = await listPastCourses();

  return (
    <div className="space-y-6">
      <Link
        href="/ogrenci"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Panel
      </Link>
      <PageHeader title="Geçmiş dersler" />
      {courses.length === 0 ? (
        <EmptyState icon={History} title="Geçmiş ders yok" description="Arşivlenen dersler burada görünür." />
      ) : (
        <CourseCards courses={courses} />
      )}
    </div>
  );
}
