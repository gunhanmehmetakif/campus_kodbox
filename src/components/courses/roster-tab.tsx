import Link from "next/link";
import { Search, Trash2, Users } from "lucide-react";

import { Pagination } from "@/components/common/pagination";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { removeRosterEntryAction } from "@/server/courses/actions";
import { listRoster } from "@/server/courses/queries";
import { AddRosterDialog } from "./add-roster-dialog";
import { RegisterHint } from "./register-hint";
import type { CourseDetail } from "./types";
import { courseHref } from "./utils";

export type RosterFilter = "all" | "registered" | "unregistered";

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "registered", label: "Kayıtlı" },
  { key: "unregistered", label: "Kayıt olmadı" },
];

export function parseRosterFilter(value: string | undefined): RosterFilter {
  return value === "registered" || value === "unregistered" ? value : "all";
}

function filterHref(courseId: string, filter: RosterFilter, studentNo?: string): string {
  const params = new URLSearchParams({ sekme: "ogrenciler" });
  if (filter !== "all") params.set("filtre", filter);
  if (studentNo) params.set("numara", studentNo);
  return `${courseHref(courseId).split("?")[0]}?${params.toString()}`;
}

type RosterTabProps = {
  course: CourseDetail;
  page: number;
  filter: RosterFilter;
  studentNo?: string;
};

export async function RosterTab({ course, page, filter, studentNo }: RosterTabProps) {
  const archived = course.archivedAt !== null;
  const roster = await listRoster(course.id, { page, filter, studentNo });
  const unregistered = course.studentCount - course.registeredCount;
  const filtered = filter !== "all" || Boolean(studentNo);
  const showHint = course.studentCount > 0 && !archived && (course.registeredCount === 0 || unregistered >= 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {course.studentCount} öğrenci · {course.registeredCount} kayıtlı
        </p>
        {archived ? null : <AddRosterDialog courseId={course.id} studentNoRegex={course.studentNoRegex} />}
      </div>

      {showHint ? <RegisterHint registerUrl={course.registerUrl} /> : null}

      {course.studentCount > 0 || filtered ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Öğrenci filtresi" className="-mb-1 overflow-x-auto pb-1">
            <ul className="flex min-w-max gap-2">
              {FILTERS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={filterHref(course.id, item.key, studentNo)}
                    aria-current={item.key === filter ? "true" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                      item.key === filter
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form action={courseHref(course.id).split("?")[0]} method="get" role="search" className="flex gap-2">
            <input type="hidden" name="sekme" value="ogrenciler" />
            {filter !== "all" ? <input type="hidden" name="filtre" value={filter} /> : null}
            <Input
              type="search"
              name="numara"
              defaultValue={studentNo}
              inputMode="numeric"
              placeholder="Tam numara ile ara"
              aria-label="Öğrenci numarası ara"
              className="h-11 min-w-0 flex-1 font-mono lg:w-60 lg:flex-none"
            />
            <Button type="submit" variant="outline" className="h-11">
              <Search aria-hidden="true" />
              Ara
            </Button>
            {studentNo ? (
              <Button asChild variant="ghost" className="h-11">
                <Link href={filterHref(course.id, filter)}>Temizle</Link>
              </Button>
            ) : null}
          </form>
        </div>
      ) : null}

      {roster.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={Users}
            title="Eşleşen öğrenci yok"
            description="Filtreyi veya aranan numarayı değiştirin."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link href={filterHref(course.id, "all")}>Filtreleri temizle</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Henüz öğrenci eklenmedi"
            description="OBS'den kopyaladığınız listeyi yapıştırarak tek seferde ekleyebilirsiniz."
            action={archived ? undefined : <AddRosterDialog courseId={course.id} studentNoRegex={course.studentNoRegex} />}
          />
        )
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          <li
            aria-hidden="true"
            className="hidden grid-cols-[10rem_1fr_11rem_3rem] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"
          >
            <span>Numara</span>
            <span>Ad soyad</span>
            <span>Durum</span>
            <span />
          </li>
          {roster.items.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[10rem_1fr_11rem_3rem]"
            >
              <span className="font-mono text-sm">{row.studentNo}</span>
              <span className="order-3 col-span-2 truncate text-sm text-muted-foreground sm:order-none sm:col-span-1 sm:text-foreground">
                {row.displayName ?? <span className="text-muted-foreground">—</span>}
              </span>
              <span className="order-2 justify-self-start sm:order-none">
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
                    row.registered
                      ? "bg-status-submitted-bg text-status-submitted"
                      : "bg-status-pending-bg text-status-pending",
                  )}
                >
                  {row.registered ? "Kayıtlı" : "Henüz kayıt olmadı"}
                </span>
              </span>
              {archived ? (
                <span />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 justify-self-end text-muted-foreground hover:text-destructive"
                      aria-label={`${row.studentNo} numaralı öğrenciyi çıkar`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  }
                  title="Öğrenciyi dersten çıkar"
                  description={
                    <>
                      <span className="font-mono">{row.studentNo}</span>
                      {row.displayName ? ` (${row.displayName})` : ""} numaralı öğrenci ders listesinden çıkarılacak.
                    </>
                  }
                  confirmLabel="Çıkar"
                  successMessage="Öğrenci listeden çıkarıldı."
                  destructive
                  action={removeRosterEntryAction}
                  hiddenFields={{ courseId: course.id, id: row.id }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination page={roster.page} pageSize={roster.pageSize} total={roster.total} />
    </div>
  );
}
