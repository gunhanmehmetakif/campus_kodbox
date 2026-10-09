import Link from "next/link";
import { ExternalLink, FileText, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Markdown } from "@/components/common/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePostAction } from "@/server/courses/actions";
import { listCoursePosts } from "@/server/courses/queries";
import type { CoursePost } from "./types";
import { formatDateTime } from "./utils";

type PostType = "announcement" | "material";

const COPY = {
  announcement: {
    newLabel: "Yeni duyuru",
    slug: "duyuru",
    icon: Megaphone,
    emptyTitle: "Henüz duyuru yok",
    emptyDescription: "Duyurular öğrencilerin ders akışında görünür ve kayıtlı öğrencilere bildirim gider.",
    deleteTitle: "Duyuruyu sil",
  },
  material: {
    newLabel: "Yeni materyal",
    slug: "materyal",
    icon: FileText,
    emptyTitle: "Henüz materyal yok",
    emptyDescription: "Ders notu, slayt veya kaynak linklerini materyal olarak paylaşın.",
    deleteTitle: "Materyali sil",
  },
} as const;

export function newPostHref(courseId: string, type: PostType): string {
  return `/egitmen/dersler/${courseId}/paylasim/yeni?tur=${COPY[type].slug}`;
}

export async function PostsTab({ courseId, type, archived }: { courseId: string; type: PostType; archived: boolean }) {
  const posts = await listCoursePosts(courseId, { type });
  const copy = COPY[type];

  const newButton = archived ? null : (
    <Button asChild className="h-11">
      <Link href={newPostHref(courseId, type)}>
        <Plus aria-hidden="true" />
        {copy.newLabel}
      </Link>
    </Button>
  );

  return (
    <div className="space-y-4">
      {posts.length > 0 && newButton ? <div className="flex sm:justify-end">{newButton}</div> : null}
      {posts.length === 0 ? (
        <EmptyState
          icon={copy.icon}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          action={newButton ?? undefined}
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} courseId={courseId} archived={archived} deleteTitle={copy.deleteTitle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({
  post,
  courseId,
  archived,
  deleteTitle,
}: {
  post: CoursePost;
  courseId: string;
  archived: boolean;
  deleteTitle: string;
}) {
  const draft = post.status === "draft";
  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {draft ? <Badge variant="secondary">Taslak</Badge> : null}
            <h3 className="font-heading text-lg leading-snug font-medium break-words">{post.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {draft || !post.publishedAt
              ? `Son düzenleme: ${formatDateTime(post.updatedAt)}`
              : `Yayınlandı: ${formatDateTime(post.publishedAt)}`}
          </p>
        </div>
        {archived ? null : (
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" className="h-11">
              <Link href={`/egitmen/dersler/${courseId}/paylasim/${post.id}`}>
                <Pencil aria-hidden="true" />
                Düzenle
              </Link>
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground hover:text-destructive"
                  aria-label={`${post.title} içeriğini sil`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              }
              title={deleteTitle}
              description={<>&ldquo;{post.title}&rdquo; kalıcı olarak silinecek.</>}
              confirmLabel="Sil"
              successMessage="Silindi."
              destructive
              action={deletePostAction}
              hiddenFields={{ courseId, id: post.id }}
            />
          </div>
        )}
      </header>
      {post.bodyMd ? <Markdown>{post.bodyMd}</Markdown> : null}
      {post.links.length > 0 ? (
        <ul className="space-y-1 border-t pt-3">
          {post.links.map((link, i) => (
            <li key={`${i}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{link.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
