import type { Metadata } from "next";
import { BookOpen, ChevronRight, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";

import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { CourseGrid } from "@/components/courses/course-card";
import { DashboardSection } from "@/components/common/dashboard-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { listPendingGrading } from "@/server/assignments/queries";
import { listMyCourses, listTermsForCourseForm } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Panel" };

export default async function InstructorHomePage() {
  const [courses, terms, pending] = await Promise.all([
    listMyCourses({ archived: false }),
    listTermsForCourseForm(),
    listPendingGrading(),
  ]);
  const newCourse = (
    <CourseFormDialog
      terms={terms}
      trigger={
        <Button className="h-11">
          <Plus aria-hidden="true" />
          {courses.length === 0 ? "İlk dersinizi oluşturun" : "Yeni ders"}
        </Button>
      }
    />
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Panel" />
      <DashboardSection title="Puanlanmayı bekleyenler">
        {pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Bekleyen teslim yok"
            description="Öğrenciler ödev teslim ettikçe burada görünür."
          />
        ) : (
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.assignmentId}>
                <Link
                  href={`/egitmen/odevler/${item.assignmentId}?filtre=ungraded`}
                  className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="w-16 shrink-0 truncate rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium text-muted-foreground">
                    {item.course.code}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block font-medium break-words">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[
                        item.ungraded > 0 ? `${item.ungraded} puanlanmadı` : null,
                        item.unpublished > 0 ? `${item.unpublished} yayınlanmadı` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Derslerim</h2>
          {courses.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="h-11">
                <Link href="/egitmen/dersler">Tümü</Link>
              </Button>
              {newCourse}
            </div>
          ) : null}
        </div>
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Henüz ders açmadınız"
            description="Ders oluşturduktan sonra öğrenci numaralarını yapıştırarak tek seferde ekleyebilirsiniz."
            action={newCourse}
            className="py-14"
          />
        ) : (
          <CourseGrid courses={courses} />
        )}
      </section>
    </div>
  );
}
