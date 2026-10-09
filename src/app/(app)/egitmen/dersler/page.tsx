import type { Metadata } from "next";
import { Archive, BookOpen, Plus } from "lucide-react";
import Link from "next/link";

import { CourseGrid } from "@/components/courses/course-card";
import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { first } from "@/components/courses/utils";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listMyCourses, listTermsForCourseForm } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Derslerim" };

export default async function InstructorCoursesPage({ searchParams }: PageProps<"/egitmen/dersler">) {
  const archived = first((await searchParams).sekme) === "arsiv";
  const [courses, terms] = await Promise.all([listMyCourses({ archived }), listTermsForCourseForm()]);

  const newCourseButton = (
    <CourseFormDialog
      terms={terms}
      trigger={
        <Button className="h-11">
          <Plus aria-hidden="true" />
          Yeni ders
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Derslerim" description="Açtığınız dersler." actions={newCourseButton} />
      <nav aria-label="Ders durumu" className="overflow-x-auto border-b">
        <ul className="flex min-w-max gap-1">
          {[
            { label: "Aktif", href: "/egitmen/dersler", current: !archived },
            { label: "Arşiv", href: "/egitmen/dersler?sekme=arsiv", current: archived },
          ].map((tab) => (
            <li key={tab.label}>
              <Link
                href={tab.href}
                aria-current={tab.current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-4 text-sm font-medium",
                  tab.current
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {courses.length === 0 ? (
        archived ? (
          <EmptyState
            icon={Archive}
            title="Arşivde ders yok"
            description="Arşivlediğiniz dersler burada listelenir ve salt okunur olur."
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Henüz ders açmadınız"
            description="Ders oluşturduktan sonra öğrenci numaralarını yapıştırarak ekleyebilirsiniz."
            action={newCourseButton}
          />
        )
      ) : (
        <CourseGrid courses={courses} />
      )}
    </div>
  );
}
