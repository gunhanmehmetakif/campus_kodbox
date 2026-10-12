import type { Metadata } from "next";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PostEditor } from "@/components/courses/post-editor";
import { isUuid } from "@/components/courses/utils";
import { Button } from "@/components/ui/button";
import { getCoursePost, getMyCourse } from "@/server/courses/queries";

export const metadata: Metadata = { title: "Paylaşımı düzenle" };

type Props = PageProps<"/egitmen/dersler/[courseId]/paylasim/[postId]">;

export default function EditPostPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <EditPost params={params} />
    </Suspense>
  );
}

async function EditPost({ params }: Pick<Props, "params">) {
  const { courseId, postId } = await params;
  if (!isUuid(courseId) || !isUuid(postId)) notFound();
  const [course, post] = await Promise.all([getMyCourse(courseId), getCoursePost(postId)]);
  if (post.courseId !== course.id) notFound();

  const back = `/egitmen/dersler/${course.id}?filtre=${post.type === "material" ? "materyal" : "duyuru"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link href={back}>
          <ArrowLeft aria-hidden="true" />
          {course.code} · {course.name}
        </Link>
      </Button>
      <PageHeader title={post.type === "material" ? "Materyali düzenle" : "Duyuruyu düzenle"} />
      {course.archivedAt ? (
        <EmptyState icon={Lock} title="Arşivlenmiş ders değiştirilemez." description="Önce dersi arşivden çıkarın." />
      ) : (
        <PostEditor
          courseId={course.id}
          type={post.type}
          post={{ id: post.id, title: post.title, bodyMd: post.bodyMd, links: post.links, status: post.status }}
        />
      )}
    </div>
  );
}
