import Link from "next/link";

import { cn } from "@/lib/utils";
import type { FeedFilter } from "@/server/student/queries";
import { studentCourseHref } from "./utils";

export const FEED_FILTERS: ReadonlyArray<{ key: FeedFilter; label: string }> = [
  { key: "tumu", label: "Tümü" },
  { key: "odev", label: "Ödev" },
  { key: "duyuru", label: "Duyuru" },
  { key: "materyal", label: "Materyal" },
];

/** `?filtre=`; legacy `?sekme=` links (notifications, bookmarks) map onto the same filters. */
export function parseFeedFilter(filtre: string | undefined, sekme: string | undefined): FeedFilter {
  const direct = FEED_FILTERS.find((f) => f.key === filtre);
  if (direct) return direct.key;
  if (sekme === "odevler") return "odev";
  if (sekme === "materyaller") return "materyal";
  return "tumu";
}

export function FeedFilterChips({ courseId, active }: { courseId: string; active: FeedFilter }) {
  return (
    <nav aria-label="Akış filtresi">
      <ul className="flex flex-wrap gap-2">
        {FEED_FILTERS.map((f) => {
          const current = f.key === active;
          return (
            <li key={f.key}>
              <Link
                href={studentCourseHref(courseId, f.key === "tumu" ? undefined : { filtre: f.key })}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
