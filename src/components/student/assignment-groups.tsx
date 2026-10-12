import { AssignmentCard } from "./assignment-card";
import type { AssignmentGroup, StudentAssignmentCard } from "@/server/student/queries";

const GROUP_ORDER: ReadonlyArray<{ key: AssignmentGroup; label: string }> = [
  { key: "bekleyen", label: "Bekleyen" },
  { key: "teslim", label: "Teslim edilen" },
  { key: "puan", label: "Puanlanan" },
  { key: "diger", label: "Diğer" },
];

/** Assignment cards under group headings; empty groups are skipped. */
export function AssignmentGroups({
  items,
  showCourse = false,
}: {
  items: StudentAssignmentCard[];
  showCourse?: boolean;
}) {
  return (
    <div className="space-y-6">
      {GROUP_ORDER.map(({ key, label }) => {
        const group = items.filter((a) => a.group === key);
        if (group.length === 0) return null;
        return (
          <section key={key} aria-label={label} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {label} ({group.length})
            </h2>
            <ul className="space-y-4">
              {group.map((a) => (
                <li key={a.id}>
                  <AssignmentCard a={a} showCourse={showCourse} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
