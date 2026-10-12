import type { Metadata } from "next";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PostEditor } from "@/components/courses/post-editor";
import { first, isUuid } from "@/components/courses/utils";
import { Button } from "@/components/ui/button";
import { getMyCourse } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Yeni paylaşım" };

type Props = PageProps<"/egitmen/dersler/[courseId]/paylasim/yeni">;

export default function NewPostPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <NewPost params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewPost({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(courseId)) notFound();
  const course = await getMyCourse(courseId);
  const type = first(query.tur) === "materyal" ? "material" : "announcement";
  const back = `/egitmen/dersler/${course.id}?filtre=${type === "material" ? "materyal" : "duyuru"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={back}>
          <ArrowLeft aria-hidden="true" />
          {course.code} · {course.name}
        </Link>
      </Button>
      <PageHeader title={type === "material" ? "Yeni materyal" : "Yeni duyuru"} />
      {course.archivedAt ? (
        <EmptyState icon={Lock} title="Arşivlenmiş ders değiştirilemez." description="Önce dersi arşivden çıkarın." />
      ) : (
        <PostEditor courseId={course.id} type={type} />
      )}
    </div>
  );
}
