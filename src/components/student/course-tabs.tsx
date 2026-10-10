import Link from "next/link";

import { cn } from "@/lib/utils";
import { studentCourseHref } from "./utils";

export const STUDENT_COURSE_TABS = [
  { key: "akis", label: "Akış" },
  { key: "materyaller", label: "Materyaller" },
  { key: "odevler", label: "Ödevler" },
] as const;

export type StudentCourseTab = (typeof STUDENT_COURSE_TABS)[number]["key"];

export const ASSIGNMENT_FILTERS = [
  { key: "bekleyen", label: "Bekleyen" },
  { key: "teslim", label: "Teslim edilen" },
  { key: "puan", label: "Puanlanan" },
] as const;

export type AssignmentFilter = (typeof ASSIGNMENT_FILTERS)[number]["key"];

export function parseStudentTab(value: string | undefined): StudentCourseTab {
  return STUDENT_COURSE_TABS.find((t) => t.key === value)?.key ?? "akis";
}

export function parseAssignmentFilter(value: string | undefined): AssignmentFilter {
  return ASSIGNMENT_FILTERS.find((f) => f.key === value)?.key ?? "bekleyen";
}

/** URL driven tabs (`?sekme=`). */
export function StudentCourseTabs({ courseId, active }: { courseId: string; active: StudentCourseTab }) {
  return (
    <nav aria-label="Ders sekmeleri" className="overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {STUDENT_COURSE_TABS.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={studentCourseHref(courseId, { sekme: tab.key })}
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

/** Filter chips for the assignments tab (`?filtre=`), without counters. */
export function AssignmentFilterChips({ courseId, active }: { courseId: string; active: AssignmentFilter }) {
  return (
    <nav aria-label="Ödev filtresi" className="flex flex-wrap gap-2">
      {ASSIGNMENT_FILTERS.map((f) => {
        const current = f.key === active;
        return (
          <Link
            key={f.key}
            href={studentCourseHref(courseId, { sekme: "odevler", filtre: f.key })}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
              current
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
