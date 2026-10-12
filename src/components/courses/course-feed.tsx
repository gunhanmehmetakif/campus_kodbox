import { ClipboardList, FileText, Megaphone } from "lucide-react";

import { AssignmentFeedCard } from "@/components/assignments/instructor/assignment-feed-card";
import { EmptyState } from "@/components/common/empty-state";
import { listCourseAssignments, type AssignmentSummary } from "@/server/assignments/queries";
import { listCoursePosts } from "@/server/courses/queries";
import type { CourseFeedFilter } from "./course-tabs";
import { PostCard } from "./post-card";
import { ShareMenu } from "./share-menu";
import type { CoursePost } from "./types";

type Entry =
  | { kind: "post"; draft: boolean; time: number; post: CoursePost }
  | { kind: "assignment"; draft: boolean; time: number; assignment: AssignmentSummary };

const EMPTY: Record<CourseFeedFilter, { icon: typeof Megaphone; title: string; description: string }> = {
  tumu: {
    icon: Megaphone,
    title: "Henüz paylaşım yok",
    description: "Duyuru, materyal veya ödev paylaştığınızda öğrenciler burada görür.",
  },
  odev: {
    icon: ClipboardList,
    title: "Henüz ödev yok",
    description: "Ödev yayınladığınızda kayıtlı öğrencilere bildirim gider.",
  },
  duyuru: {
    icon: Megaphone,
    title: "Henüz duyuru yok",
    description: "Duyurular öğrencilerin ders akışında görünür ve bildirim gider.",
  },
  materyal: {
    icon: FileText,
    title: "Henüz materyal yok",
    description: "Ders notu, slayt veya kaynak linklerini materyal olarak paylaşın.",
  },
};

/** Instructor feed: drafts first, then newest first. Assignments have no publish date yet, so the deadline stands in. */
export async function CourseFeed({
  courseId,
  filter,
  archived,
}: {
  courseId: string;
  filter: CourseFeedFilter;
  archived: boolean;
}) {
  const [announcements, materials, assignments] = await Promise.all([
    filter === "tumu" || filter === "duyuru" ? listCoursePosts(courseId, { type: "announcement" }) : [],
    filter === "tumu" || filter === "materyal" ? listCoursePosts(courseId, { type: "material" }) : [],
    filter === "tumu" || filter === "odev" ? listCourseAssignments(courseId) : [],
  ]);

  const entries: Entry[] = [
    ...[...announcements, ...materials].map((post): Entry => ({
      kind: "post",
      draft: post.status === "draft",
      time: (post.publishedAt ?? post.updatedAt).getTime(),
      post,
    })),
    ...assignments.map((assignment): Entry => ({
      kind: "assignment",
      draft: assignment.status === "draft",
      time: assignment.publishedAt?.getTime() ?? 0,
      assignment,
    })),
  ].sort((x, y) => Number(y.draft) - Number(x.draft) || y.time - x.time);

  if (entries.length === 0) {
    const empty = EMPTY[filter];
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={archived ? undefined : <ShareMenu courseId={courseId} />}
      />
    );
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.kind === "post" ? `post-${entry.post.id}` : `assignment-${entry.assignment.id}`}>
          {entry.kind === "post" ? (
            <PostCard post={entry.post} courseId={courseId} archived={archived} />
          ) : (
            <AssignmentFeedCard assignment={entry.assignment} archived={archived} />
          )}
        </li>
      ))}
    </ul>
  );
}
