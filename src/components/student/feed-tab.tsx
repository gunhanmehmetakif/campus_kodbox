import Link from "next/link";
import { ClipboardList, ExternalLink, FileText, Megaphone } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Markdown } from "@/components/common/markdown";
import { Pagination } from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { listStudentCourseFeed, type FeedItem } from "@/server/student/queries";
import { CollapsibleBody } from "./collapsible-body";
import { formatLongDate, formatShortDateTime, studentAssignmentHref } from "./utils";

type PostItem = Extract<FeedItem, { kind: "post" }>;
type AssignmentItem = Extract<FeedItem, { kind: "assignment" }>;

export async function FeedTab({ courseId, tab, page }: { courseId: string; tab: "akis" | "materyaller"; page: number }) {
  const result = await listStudentCourseFeed(courseId, { tab, page });

  if (result.items.length === 0) {
    return tab === "akis" ? (
      <EmptyState
        icon={Megaphone}
        title="Bu derste henüz içerik yok"
        description="Eğitmeniniz duyuru, materyal veya ödev paylaştığında burada görünür."
      />
    ) : (
      <EmptyState
        icon={FileText}
        title="Henüz materyal yok"
        description="Eğitmeniniz ders notu veya kaynak paylaştığında burada görünür."
      />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {result.items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            {item.kind === "post" ? <PostCard post={item} /> : <AssignmentCard item={item} />}
          </li>
        ))}
      </ul>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}

function PostCard({ post }: { post: PostItem }) {
  const announcement = post.postType === "announcement";
  return (
    <article
      id={`post-${post.id}`}
      className="scroll-mt-20 space-y-3 rounded-xl border bg-card p-4 text-card-foreground target:ring-2 target:ring-ring"
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={announcement ? "default" : "secondary"}>
            {announcement ? <Megaphone aria-hidden="true" /> : <FileText aria-hidden="true" />}
            {announcement ? "Duyuru" : "Materyal"}
          </Badge>
          <time dateTime={post.publishedAt.toISOString()} className="text-xs text-muted-foreground">
            {formatLongDate(post.publishedAt)}
          </time>
        </div>
        <h3 className="font-heading text-lg leading-snug font-medium break-words">{post.title}</h3>
      </header>
      {post.bodyMd.trim() ? (
        <CollapsibleBody>
          <Markdown>{post.bodyMd}</Markdown>
        </CollapsibleBody>
      ) : null}
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
                <span className="truncate">{link.title || link.url}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function AssignmentCard({ item }: { item: AssignmentItem }) {
  return (
    <Link
      href={studentAssignmentHref(item.id)}
      className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ClipboardList className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-sm">
        <span className="font-medium break-words">Yeni ödev: {item.title}</span>
        <span className="text-muted-foreground">
          {" · Son teslim "}
          {item.dueAt ? formatShortDateTime(item.dueAt) : "süresiz"}
        </span>
      </span>
    </Link>
  );
}
