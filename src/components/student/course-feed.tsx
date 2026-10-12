import { ClipboardList, ExternalLink, FileText, Megaphone } from "lucide-react";
import { unstable_rethrow } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { Markdown } from "@/components/common/markdown";
import { Pagination } from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { getAssignmentForStudent } from "@/server/assignments/queries";
import { listStudentCourseFeed, type FeedFilter, type FeedItem } from "@/server/student/queries";
import { AssignmentCard, type AssignmentCardData } from "./assignment-card";
import { AssignmentGroups } from "./assignment-groups";
import { CollapsibleBody } from "./collapsible-body";
import { formatLongDate } from "./utils";

type PostItem = Extract<FeedItem, { kind: "post" }>;

const EMPTY: Record<FeedFilter, { icon: typeof Megaphone; title: string; description: string }> = {
  tumu: {
    icon: Megaphone,
    title: "Bu derste henüz içerik yok",
    description: "Eğitmeniniz duyuru, materyal veya ödev paylaştığında burada görünür.",
  },
  odev: { icon: ClipboardList, title: "Ödev yok", description: "Eğitmeniniz ödev yayınladığında burada görünür." },
  duyuru: { icon: Megaphone, title: "Duyuru yok", description: "Eğitmeniniz duyuru paylaştığında burada görünür." },
  materyal: {
    icon: FileText,
    title: "Henüz materyal yok",
    description: "Eğitmeniniz ders notu veya kaynak paylaştığında burada görünür.",
  },
};

/** Deep-linked assignment (`?odev=`): the feed's own card when present, else a direct lookup; ignored if foreign. */
async function resolvePinned(
  courseId: string,
  odev: string | undefined,
  items: FeedItem[],
): Promise<AssignmentCardData | null> {
  if (!odev) return null;
  for (const item of items) {
    if (item.kind === "assignment" && item.assignment.id === odev) return item.assignment;
  }
  try {
    const view = await getAssignmentForStudent(odev);
    return view.course.id === courseId ? view : null;
  } catch (error) {
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return null;
    unstable_rethrow(error);
    throw error;
  }
}

export async function CourseFeed({
  courseId,
  filter,
  page,
  odev,
}: {
  courseId: string;
  filter: FeedFilter;
  page: number;
  odev?: string;
}) {
  const result = await listStudentCourseFeed(courseId, { filter, page });
  const pinned = page === 1 ? await resolvePinned(courseId, odev, result.items) : null;
  const items = pinned
    ? result.items.filter((item) => !(item.kind === "assignment" && item.assignment.id === pinned.id))
    : result.items;
  const canAutoOpen = pinned !== null && (pinned.window.state === "open" || pinned.window.state === "late");

  if (items.length === 0 && !pinned) {
    const empty = EMPTY[filter];
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
  }

  return (
    <div className="space-y-4">
      {pinned ? <AssignmentCard a={pinned} highlight autoOpen={canAutoOpen} /> : null}
      {filter === "odev" ? (
        <AssignmentGroups
          items={items.flatMap((item) => (item.kind === "assignment" ? [item.assignment] : []))}
        />
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={`${item.kind}-${item.kind === "post" ? item.id : item.assignment.id}`}>
                {item.kind === "post" ? <PostCard post={item} /> : <AssignmentCard a={item.assignment} />}
              </li>
            ))}
          </ul>
          <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
        </>
      )}
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
