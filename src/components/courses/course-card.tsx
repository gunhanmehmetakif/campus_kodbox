import Link from "next/link";
import { Archive } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { courseHref } from "./utils";
import type { CourseSummary } from "./types";

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link
      href={courseHref(course.id)}
      className="group flex min-h-32 flex-col justify-between gap-4 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-muted-foreground">{course.code}</span>
          {course.archivedAt ? (
            <Badge variant="secondary">
              <Archive aria-hidden="true" />
              Arşivde
            </Badge>
          ) : null}
        </div>
        <h3 className="font-heading text-lg leading-snug font-medium break-words">{course.name}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {course.termName} · {course.studentCount} öğrenci · {course.registeredCount} kayıtlı
      </p>
    </Link>
  );
}

export function CourseGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
