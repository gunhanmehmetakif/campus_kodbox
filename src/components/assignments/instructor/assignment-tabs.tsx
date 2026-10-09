import Link from "next/link";

import { cn } from "@/lib/utils";
import { assignmentHref } from "./format";

export type AssignmentTabKey = "detay" | "teslimler";

const TABS = [
  { key: "detay", label: "Detay" },
  { key: "teslimler", label: "Teslimler" },
] as const;

export function parseAssignmentTab(value: string | undefined): AssignmentTabKey | undefined {
  return TABS.find((tab) => tab.key === value)?.key;
}

export function AssignmentTabs({ assignmentId, active }: { assignmentId: string; active: AssignmentTabKey }) {
  return (
    <nav aria-label="Ödev sekmeleri" className="overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link
              href={assignmentHref(assignmentId, tab.key)}
              aria-current={tab.key === active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors",
                tab.key === active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
