import Link from "next/link";

import { cn } from "@/lib/utils";
import { courseHref } from "./utils";

export const COURSE_TABS = [
  { key: "akis", label: "Akış" },
  { key: "materyaller", label: "Materyaller" },
  { key: "odevler", label: "Ödevler" },
  { key: "ogrenciler", label: "Öğrenciler" },
] as const;

export type CourseTabKey = (typeof COURSE_TABS)[number]["key"];

export function parseCourseTab(value: string | undefined): CourseTabKey {
  return COURSE_TABS.find((tab) => tab.key === value)?.key ?? "akis";
}

/** URL driven tabs (`?sekme=`); scrolls horizontally on narrow screens. */
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
