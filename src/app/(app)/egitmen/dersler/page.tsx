import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Derslerim" };

export default function InstructorCoursesPage() {
  return (
    <PlaceholderPage
      title="Derslerim"
      description="Açtığınız dersler burada listelenir."
      emptyTitle="Henüz ders açmadınız"
      emptyDescription="Yeni bir ders oluşturduğunuzda burada görünür."
      icon={BookOpen}
    />
  );
}
