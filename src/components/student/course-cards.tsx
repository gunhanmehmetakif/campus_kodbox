import Link from "next/link";
import { Archive, BookOpen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import type { StudentCourseCard } from "@/server/student/queries";
import { studentCourseHref } from "./utils";

export function CourseCards({ courses }: { courses: StudentCourseCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={studentCourseHref(course.id)}
          className="flex min-h-28 flex-col justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-medium text-muted-foreground">{course.code}</span>
              {course.archived ? (
                <Badge variant="secondary">
                  <Archive aria-hidden="true" />
                  Arşivde
                </Badge>
              ) : null}
              {course.pendingCount > 0 ? (
                <span className="inline-flex h-5 items-center rounded-full bg-status-pending-bg px-2 text-xs font-medium text-status-pending">
                  {course.pendingCount} bekleyen
                </span>
              ) : null}
            </div>
            <h3 className="font-heading text-lg leading-snug font-medium break-words">{course.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {course.instructorName ? `${course.instructorName} · ` : ""}
            {course.termName}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function CoursesEmpty() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Henüz bir derse eklenmediniz"
      description="Eğitmeniniz sizi derse eklediğinde burada görünür. Numaranızın doğru girildiğinden emin olun."
    />
  );
}
