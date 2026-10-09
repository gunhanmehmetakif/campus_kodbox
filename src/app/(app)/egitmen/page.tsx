import type { Metadata } from "next";
import { BookOpen, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";

import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { CourseGrid } from "@/components/courses/course-card";
import { DashboardSection } from "@/components/common/dashboard-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { listMyCourses, listTermsForCourseForm } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Panel" };

export default async function InstructorHomePage() {
  const [courses, terms] = await Promise.all([listMyCourses({ archived: false }), listTermsForCourseForm()]);
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
      <PageHeader title="Panel" description="Puanlanmayı bekleyen teslimler ve derslerinizin özeti." />
      <DashboardSection title="Puanlanmayı bekleyenler">
        <EmptyState
          icon={ClipboardCheck}
          title="Bekleyen teslim yok"
          description="Öğrenciler ödev teslim ettikçe burada görünür."
        />
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
