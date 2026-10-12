import Link from "next/link";
import { Megaphone } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import type { AnnouncementItem } from "@/server/student/queries";
import { formatAgo, studentCourseHref } from "./utils";

export function AnnouncementsList({ items }: { items: AnnouncementItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon={Megaphone} title="Duyuru yok" description="Derslerinizdeki duyurular burada listelenir." />;
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${studentCourseHref(item.course.id)}#post-${item.id}`}
            className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-medium break-words">{item.title}</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-mono">{item.course.code}</span> · {formatAgo(item.publishedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
