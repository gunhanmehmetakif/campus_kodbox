import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { first } from "@/components/courses/utils";
import { PastCourses, StudentDashboard } from "@/components/student/dashboard-content";

export const metadata: Metadata = { title: "Panel" };

export default function StudentHomePage({ searchParams }: PageProps<"/ogrenci">) {
  return (
    <Suspense fallback={<PageSkeleton variant="cards" />}>
      <StudentHomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StudentHomeContent({ searchParams }: { searchParams: PageProps<"/ogrenci">["searchParams"] }) {
  const query = await searchParams;
  return first(query.gecmis) === "1" ? <PastCourses /> : <StudentDashboard />;
}
