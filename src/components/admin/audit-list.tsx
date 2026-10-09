import { formatDateTime } from "@/components/admin/format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listAuditLogs } from "@/server/admin/queries";

type AuditRow = Awaited<ReturnType<typeof listAuditLogs>>["items"][number];

/** Table on desktop, card list on mobile. */
export function AuditList({ items }: { items: AuditRow[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zaman</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>İşlem</TableHead>
              <TableHead>Hedef</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                <TableCell>{r.actorLabel}</TableCell>
                <TableCell className="font-medium">{r.actionLabel}</TableCell>
                <TableCell className="text-muted-foreground">{r.targetLabel ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <Card className="gap-1 p-4">
              <p className="font-medium">{r.actionLabel}</p>
              <p className="text-sm">
                {r.actorLabel}
                {r.targetLabel ? <span className="text-muted-foreground"> → {r.targetLabel}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
