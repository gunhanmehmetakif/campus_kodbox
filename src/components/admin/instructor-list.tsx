import { KeyRound } from "lucide-react";

import { formatDateTime } from "@/components/admin/format";
import { InstructorRowActions } from "@/components/admin/instructor-dialogs";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listInstructors } from "@/server/admin/queries";

type Instructor = Awaited<ReturnType<typeof listInstructors>>["items"][number];

function MustChangeNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-status-pending">
      <KeyRound className="size-3" aria-hidden="true" />
      Şifre değişimi bekleniyor
    </span>
  );
}

/** Table on desktop, card list on mobile. */
export function InstructorList({ items }: { items: Instructor[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Eğitmen</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Ders</TableHead>
              <TableHead>Son giriş</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">İşlemler</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <div className="font-medium">{i.displayName}</div>
                  <div className="text-xs text-muted-foreground">{i.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <UserStatusBadge status={i.status} />
                    <MustChangeNote show={i.mustChangePassword} />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{i.courseCount}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(i.lastLoginAt, "Hiç girmedi")}</TableCell>
                <TableCell>
                  <InstructorRowActions instructor={i} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((i) => (
          <li key={i.id}>
            <Card className="gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{i.displayName}</p>
                  <p className="text-xs break-all text-muted-foreground">{i.email}</p>
                </div>
                <InstructorRowActions instructor={i} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <UserStatusBadge status={i.status} />
                <MustChangeNote show={i.mustChangePassword} />
              </div>
              <p className="text-xs text-muted-foreground">
                {i.courseCount} ders · Son giriş: {formatDateTime(i.lastLoginAt, "Hiç girmedi")}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
