import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AudienceEmailField } from "@/components/auth/audience-email-field";
import { EmptyState } from "@/components/common/empty-state";
import { Markdown } from "@/components/common/markdown";
import { PageHeader } from "@/components/common/page-header";
import { SUBMISSION_STATUSES, StatusBadge } from "@/components/common/status-badge";
import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Stil rehberi", robots: { index: false } };

const SWATCHES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["destructive", "bg-destructive"],
  ["border", "bg-border"],
  ["sidebar", "bg-sidebar"],
  ["status-submitted", "bg-status-submitted"],
  ["status-late", "bg-status-late"],
  ["status-pending", "bg-status-pending"],
  ["status-graded", "bg-status-graded"],
] as const;

const SAMPLE_MARKDOWN = `## Duyuru

Vize **12 Kasım** günü yapılacak. [Ders sayfası](https://example.com)

- Kimlik getirmeyi unutmayın
- Hesap makinesi serbest

| Konu | Ağırlık |
| --- | --- |
| Diziler | %30 |
| Döngüler | %40 |
`;

export default function DesignGuidePage() {
  // Development-only reference page.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8">
      <PageHeader title="Stil rehberi" description="Geliştirme içi referans: renkler, tipografi ve ortak bileşenler." />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Renkler</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-12 rounded-lg border ${cls}`} />
              <p className="font-mono text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tipografi</h2>
        <div className="space-y-2">
          <p className="font-heading text-3xl font-semibold">Başlık: Öğrenci, çağrı, ışık, şifre, ğüşiöç</p>
          <p className="text-base">Gövde (Inter): Pijama hazırlığı için yağız şoför çabucak güvendi. ĞÜŞİÖÇ</p>
          <p className="text-sm text-muted-foreground">İkincil metin: ödev teslimi 14:30&apos;da kapanır.</p>
          <p className="font-mono text-sm">Mono: 260000009</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Teslim durumları</h2>
        <div className="flex flex-wrap gap-2">
          {SUBMISSION_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <DeadlineCountdown dueAt="2099-01-01T12:00:00+03:00" />
          <DeadlineCountdown dueAt="2020-01-01T12:00:00+03:00" />
          <DeadlineCountdown dueAt="2020-01-01T12:00:00+03:00" submitted />
          <DeadlineCountdown dueAt={null} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Düğmeler ve etiketler</h2>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11">Birincil</Button>
          <Button variant="secondary" className="h-11">İkincil</Button>
          <Button variant="outline" className="h-11">Çerçeveli</Button>
          <Button variant="ghost" className="h-11">Hayalet</Button>
          <Button variant="destructive" className="h-11">Sil</Button>
          <Badge>Etiket</Badge>
          <Badge variant="secondary">İkincil</Badge>
          <Badge variant="outline">Çerçeveli</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Form</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Okul maili kutusu</CardTitle>
            <CardDescription>Tam mail yapıştırın: @ sonrası silinir, sekme önerilir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AudienceEmailField />
            <div className="space-y-1.5">
              <Label htmlFor="demo-text">Metin alanı</Label>
              <Input id="demo-text" className="h-11" placeholder="BİL101" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tablo</h2>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Puan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">260000009</TableCell>
                <TableCell><StatusBadge status="graded" /></TableCell>
                <TableCell className="text-right">85</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">260000042</TableCell>
                <TableCell><StatusBadge status="late" /></TableCell>
                <TableCell className="text-right text-muted-foreground">–</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Boş durum, iskelet, Markdown</h2>
        <EmptyState icon={Inbox} title="Henüz bir derse eklenmediniz" description="Eğitmeniniz sizi eklediğinde burada görünür." />
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Card>
          <CardContent>
            <Markdown>{SAMPLE_MARKDOWN}</Markdown>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
