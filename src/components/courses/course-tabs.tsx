import Link from "next/link";

import { cn } from "@/lib/utils";
import { courseHref } from "./utils";

export const COURSE_TABS = [
  { key: "akis", label: "Akış" },
  { key: "ogrenciler", label: "Öğrenciler" },
] as const;

export type CourseTabKey = (typeof COURSE_TABS)[number]["key"];

/** Legacy `sekme=odevler|materyaller` values fall back to the feed. */
export function parseCourseTab(value: string | undefined): CourseTabKey {
  return COURSE_TABS.find((tab) => tab.key === value)?.key ?? "akis";
}

export const COURSE_FEED_FILTERS = [
  { key: "tumu", label: "Tümü" },
  { key: "odev", label: "Ödev" },
  { key: "duyuru", label: "Duyuru" },
  { key: "materyal", label: "Materyal" },
] as const;

export type CourseFeedFilter = (typeof COURSE_FEED_FILTERS)[number]["key"];

export function parseCourseFeedFilter(filtre: string | undefined, sekme: string | undefined): CourseFeedFilter {
  const direct = COURSE_FEED_FILTERS.find((f) => f.key === filtre);
  if (direct) return direct.key;
  if (sekme === "odevler") return "odev";
  if (sekme === "materyaller") return "materyal";
  return "tumu";
}

/** URL driven tabs (`?sekme=`). */
export function CourseTabs({ courseId, active }: { courseId: string; active: CourseTabKey }) {
  return (
    <nav aria-label="Ders sekmeleri" className="overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {COURSE_TABS.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={courseHref(courseId, tab.key)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  current
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CourseFeedChips({ courseId, active }: { courseId: string; active: CourseFeedFilter }) {
  return (
    <nav aria-label="Akış filtresi">
      <ul className="flex flex-wrap gap-2">
        {COURSE_FEED_FILTERS.map((f) => {
          const current = f.key === active;
          return (
            <li key={f.key}>
              <Link
                href={courseHref(courseId, "akis", f.key === "tumu" ? undefined : f.key)}
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
