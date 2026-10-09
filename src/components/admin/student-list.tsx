import { formatDateTime } from "@/components/admin/format";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { UserStatusToggle } from "@/components/admin/user-status-toggle";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listStudents } from "@/server/admin/queries";

type Student = Awaited<ReturnType<typeof listStudents>>["items"][number];

/** Table on desktop, card list on mobile. Student numbers arrive masked from the server. */
export function StudentList({ items }: { items: Student[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Öğrenci no</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Ders</TableHead>
              <TableHead>Kayıt tarihi</TableHead>
              <TableHead>Son giriş</TableHead>
              <TableHead className="w-44">
                <span className="sr-only">İşlemler</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-medium">{s.studentNoMasked}</TableCell>
                <TableCell>
                  <UserStatusBadge status={s.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{s.courseCount}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(s.lastLoginAt, "Hiç girmedi")}</TableCell>
                <TableCell className="text-right">
                  <UserStatusToggle id={s.id} status={s.status} label={s.studentNoMasked} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((s) => (
          <li key={s.id}>
            <Card className="gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono font-medium">{s.studentNoMasked}</p>
                <UserStatusBadge status={s.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {s.courseCount} ders · Kayıt: {formatDateTime(s.createdAt)} · Son giriş:{" "}
                {formatDateTime(s.lastLoginAt, "Hiç girmedi")}
              </p>
              <UserStatusToggle id={s.id} status={s.status} label={s.studentNoMasked} />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
