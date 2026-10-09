import { Archive, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { listCoursesForAdmin } from "@/server/admin/queries";

type Course = Awaited<ReturnType<typeof listCoursesForAdmin>>["items"][number];

function CourseState({ archived }: { archived: boolean }) {
  const Icon = archived ? Archive : CheckCircle2;
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        archived ? "bg-muted text-muted-foreground" : "bg-status-submitted-bg text-status-submitted",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {archived ? "Arşivli" : "Aktif"}
    </span>
  );
}

/** Table on desktop, card list on mobile. */
export function CourseList({ items }: { items: Course[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ders</TableHead>
              <TableHead>Eğitmen</TableHead>
              <TableHead>Dönem</TableHead>
              <TableHead className="text-right">Öğrenci</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{c.code}</div>
                </TableCell>
                <TableCell>{c.instructorName}</TableCell>
                <TableCell className="text-muted-foreground">{c.termName}</TableCell>
                <TableCell className="text-right tabular-nums">{c.studentCount}</TableCell>
                <TableCell>
                  <CourseState archived={c.archivedAt !== null} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((c) => (
          <li key={c.id}>
            <Card className="gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{c.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                </div>
                <CourseState archived={c.archivedAt !== null} />
              </div>
              <p className="text-sm">{c.instructorName}</p>
              <p className="text-xs text-muted-foreground">
                {c.termName} · {c.studentCount} öğrenci
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
