import Link from "next/link";
import { ExternalLink, FileText, Megaphone, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Markdown } from "@/components/common/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePostAction } from "@/server/courses/actions";
import type { CoursePost } from "./types";
import { formatDateTime } from "./utils";

/** Announcement or material card of the instructor feed. */
export function PostCard({
  post,
  courseId,
  archived,
}: {
  post: CoursePost;
  courseId: string;
  archived: boolean;
}) {
  const draft = post.status === "draft";
  const material = post.type === "material";
  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
      <header className="space-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {material ? <FileText aria-hidden="true" /> : <Megaphone aria-hidden="true" />}
              {material ? "Materyal" : "Duyuru"}
            </Badge>
            {draft ? <Badge variant="secondary">Taslak</Badge> : null}
            <span className="text-xs text-muted-foreground">
              {draft || !post.publishedAt
                ? `Son düzenleme: ${formatDateTime(post.updatedAt)}`
                : `Yayınlandı: ${formatDateTime(post.publishedAt)}`}
            </span>
          </div>
          <h3 className="font-heading text-lg leading-snug font-medium break-words">{post.title}</h3>
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
              title={material ? "Materyali sil" : "Duyuruyu sil"}
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
