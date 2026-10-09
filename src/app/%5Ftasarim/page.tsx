import { ClipboardListIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Tessera } from "@/components/auth/tessera";
import { CourseCodeBadge } from "@/components/course-code-badge";
import { DateTime } from "@/components/date-time";
import { DeadlineRibbon } from "@/components/deadline-ribbon";
import { EmptyState } from "@/components/empty-state";
import { LinkList } from "@/components/link-list";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { RelativeTime } from "@/components/relative-time";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TIME } from "@/lib/dates";
import { maskStudentNo } from "@/lib/mask";
import { getRequestNow } from "@/lib/server/now";

import { FormDemos, OverlayDemos, TabsDemo } from "./client-demos";

export const metadata: Metadata = { title: "Tasarım rehberi" };

/**
 * /_tasarim — SADECE GELİŞTİRMEDE erişilebilen stil rehberi.
 * Token'lar, tipografi, bileşenler ve Teslim Şeridi'nin tüm durumları.
 * Yeni ortak bileşen eklendiğinde buraya da örneğini ekleyin.
 */
export default function DesignGuidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="neutral">Tasarım rehberi</Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex max-w-content flex-col gap-14 px-4 py-10 sm:px-6">
        <Section title="Renk token'ları" description="DESIGN.md · globals.css. Bileşenlerde hex yazılmaz; bg-*, text-*, border-* sınıfları kullanılır.">
          <Colors />
        </Section>

        <Section title="Tipografi" description="Display: Schibsted Grotesk · Gövde: Instrument Sans · Veri: JetBrains Mono (tabular).">
          <Typography />
        </Section>

        <Section title="Teslim Şeridi" description="İmza öğesi. Tüm durumlar canlı sayaçla. Son 1 saatte saniyelik güncellenir.">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <RibbonStates />
          </Suspense>
        </Section>

        <Section title="Butonlar ve rozetler">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Ödevi yayınla</Button>
              <Button variant="outline">Taslak kaydet</Button>
              <Button variant="secondary">İkincil</Button>
              <Button variant="ghost">Hayalet</Button>
              <Button variant="destructive">Dersi sil</Button>
              <Button variant="destructive-soft">Kaldır</Button>
              <Button variant="link">Bağlantı</Button>
              <Button disabled>Devre dışı</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">Büyük</Button>
              <Button>Varsayılan</Button>
              <Button size="sm">Küçük</Button>
              <Button size="xs">Çok küçük</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Varsayılan</Badge>
              <Badge variant="laurel">Yayında</Badge>
              <Badge variant="saffron">Zamanlanmış</Badge>
              <Badge variant="brick">Gecikti</Badge>
              <Badge variant="sky">Teslim edildi</Badge>
              <Badge variant="neutral">Taslak</Badge>
              <Badge variant="outline">Arşivlendi</Badge>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <CourseCodeBadge code="bil101" size="sm" />
              <CourseCodeBadge code="BİL101" />
              <CourseCodeBadge code="MAT201" size="lg" tone="laurel" />
            </div>
          </div>
        </Section>

        <Section title="Form öğeleri" description="Her alanın görünür etiketi var; hata alanın altında brick renginde.">
          <FormDemos />
        </Section>

        <Section title="Sekmeler, katmanlar ve bildirimler">
          <div className="flex flex-col gap-6">
            <TabsDemo />
            <OverlayDemos />
          </div>
        </Section>

        <Section title="Sayfa başlığı, kart ve tablo">
          <div className="flex flex-col gap-8">
            <div className="rounded-xl border border-line bg-surface p-6">
              <PageHeader
                size="lg"
                eyebrow={<CourseCodeBadge code="BİL101" size="lg" />}
                title="Programlamaya Giriş"
                meta={
                  <>
                    <span>2026-2027 Güz</span>
                    <span aria-hidden>·</span>
                    <span>Dr. Öğr. Üyesi Ahmet Yılmaz</span>
                  </>
                }
                actions={<Button>Ödev oluştur</Button>}
                className="pb-0"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Hafta 3 · Döngüler</CardTitle>
                  <CardDescription>
                    Yayın <DateTime value="2026-10-05T07:00:00Z" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-ink-soft">for ve while döngüleri, örnek alıştırmalar.</CardContent>
                <CardFooter className="justify-between">
                  <Badge variant="laurel">Yayında</Badge>
                  <Button size="sm" variant="ghost">
                    Aç
                  </Button>
                </CardFooter>
              </Card>
              <EmptyState
                icon={ClipboardListIcon}
                title="Henüz ödev yok"
                description="Öğrencilerin görmesi için ilk ödevi oluştur."
                action={<Button>Ödev oluştur</Button>}
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Öğrenci no</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Teslim zamanı</TableHead>
                    <TableHead className="text-right">Puan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["260000009", "Teslim etti", "2026-10-11T18:22:00Z", "85"],
                    ["260000010", "Geç", "2026-10-13T08:05:00Z", "—"],
                    ["260000011", "Etmedi", null, "—"],
                  ].map(([no, status, at, score]) => (
                    <TableRow key={no}>
                      <TableCell className="font-mono">{no}</TableCell>
                      <TableCell>
                        <Badge variant={status === "Teslim etti" ? "sky" : status === "Geç" ? "brick" : "neutral"}>{status}</Badge>
                      </TableCell>
                      <TableCell>{at ? <DateTime value={at} /> : <span className="text-ink-soft">—</span>}</TableCell>
                      <TableCell className="text-right font-mono">{score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-label text-ink-soft">
              Admin görünümünde maskeli numara: <span className="font-mono text-ink">{maskStudentNo("260000009")}</span>
            </p>
          </div>
        </Section>

        <Section title="Markdown ve linkler">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <Markdown>{SAMPLE_MD}</Markdown>
            </div>
            <LinkList
              links={[
                { title: "Hafta 3 slaytları", url: "https://docs.google.com/presentation/d/abc/edit" },
                { title: "Örnek kodlar", url: "https://drive.google.com/drive/folders/xyz" },
                { title: "Ders kaydı", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
                { title: "Not tablosu", url: "https://docs.google.com/spreadsheets/d/abc" },
                { title: "", url: "https://developer.mozilla.org/tr/docs/Web/JavaScript" },
              ]}
            />
          </div>
        </Section>

        <Section title="Mozaik tesserası" description="Auth ekranlarının sol paneli (her temada koyu).">
          <div className="relative h-72 overflow-hidden rounded-xl bg-tessera text-tessera-fg">
            <Tessera />
            <p className="absolute bottom-6 left-6 max-w-[18ch] font-display text-xl leading-tight font-bold">
              Derslerin, ödevlerin, teslimlerin — tek yerde.
            </p>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-line pb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const TOKENS: { name: string; light: string; dark: string; className: string; use: string }[] = [
  { name: "--ink", light: "#13203A", dark: "#E6EAF2", className: "bg-ink", use: "Ana metin, başlıklar" },
  { name: "--ink-soft", light: "#4A5872", dark: "#A3AEC2", className: "bg-ink-soft", use: "İkincil metin" },
  { name: "--paper", light: "#F4F6F9", dark: "#0E1525", className: "bg-paper", use: "Sayfa zemini" },
  { name: "--surface", light: "#FFFFFF", dark: "#151E31", className: "bg-surface", use: "Kartlar, paneller" },
  { name: "--line", light: "#DDE2EA", dark: "#26324A", className: "bg-line", use: "Kenarlıklar" },
  { name: "--laurel", light: "#1E6B57", dark: "#4FB394", className: "bg-laurel", use: "Birincil eylem" },
  { name: "--laurel-tint", light: "#E3F1EC", dark: "#16352E", className: "bg-laurel-tint", use: "Birincil vurgu zemini" },
  { name: "--saffron", light: "#C98512", dark: "#E8B04B", className: "bg-saffron", use: "Yaklaşan son tarih (≤48 sa)" },
  { name: "--saffron-tint", light: "#FBF0DC", dark: "#3A2C12", className: "bg-saffron-tint", use: "" },
  { name: "--brick", light: "#B83A28", dark: "#E5735F", className: "bg-brick", use: "Gecikmiş / hata / yıkıcı" },
  { name: "--brick-tint", light: "#F8E4E0", dark: "#3B1B16", className: "bg-brick-tint", use: "" },
  { name: "--sky", light: "#2D5BB8", dark: "#7EA2E8", className: "bg-sky", use: "Bilgi, teslim edildi" },
];

function Colors() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TOKENS.map((t) => (
        <li key={t.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <span className={`size-11 shrink-0 rounded-lg border border-line ${t.className}`} />
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-label text-ink">{t.name}</span>
            <span className="font-mono text-xs text-ink-soft">
              {t.light} · {t.dark}
            </span>
            {t.use ? <span className="truncate text-xs text-ink-soft">{t.use}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Typography() {
  const scale = [
    ["text-3xl", "44", "font-display font-bold", "Derslerin, ödevlerin"],
    ["text-2xl", "32", "font-display font-bold", "Programlamaya Giriş"],
    ["text-xl", "24", "font-display font-bold", "Yaklaşan teslimler"],
    ["text-lg", "20", "font-display font-semibold", "Hafta 3 · Döngüler"],
    ["text-base", "16", "font-sans font-medium", "Ödev açıklaması ve kurallar"],
    ["text-sm", "14", "font-sans", "Gövde metni: Öğrenci süre dolana kadar teslimini güncelleyebilir. ğ ş ı İ ö ü ç"],
    ["text-label", "13", "font-sans text-ink-soft", "Etiket ve yardımcı metin"],
    ["text-xs", "12", "font-sans text-ink-soft", "Meta bilgi, rozet"],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
        {scale.map(([cls, px, font, sample]) => (
          <li key={cls} className="flex items-baseline gap-4 px-4 py-3">
            <span className="w-24 shrink-0 font-mono text-xs text-ink-soft">
              {cls} · {px}
            </span>
            <span className={`${cls} ${font} min-w-0 truncate`}>{sample}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-baseline gap-6 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="font-mono text-sm">260000009</span>
        <span className="font-mono text-sm">12 Eki 2026, 23:59</span>
        <span className="font-mono text-sm">2g 04s 13dk</span>
        <span className="text-sm text-ink-soft">
          Göreli: <RelativeTime value="2026-10-01T09:00:00Z" />
        </span>
      </div>
    </div>
  );
}

async function RibbonStates() {
  const now = await getRequestNow();
  const at = (ms: number) => new Date(now + ms);
  const { HOUR, DAY, MINUTE } = TIME;

  const states: { label: string; props: Omit<React.ComponentProps<typeof DeadlineRibbon>, "serverNow"> }[] = [
    { label: "Normal (5 gün var)", props: { publishAt: at(-6 * DAY), dueAt: at(5 * DAY) } },
    { label: "Yaklaşıyor (≤ 48 saat)", props: { publishAt: at(-8 * DAY), dueAt: at(20 * HOUR) } },
    { label: "Son 1 saat (saniyelik)", props: { publishAt: at(-3 * DAY), dueAt: at(42 * MINUTE) } },
    { label: "Gecikmiş (geç teslim kapalı)", props: { publishAt: at(-9 * DAY), dueAt: at(-2 * DAY) } },
    {
      label: "Geç teslim penceresi (kesikli)",
      props: { publishAt: at(-7 * DAY), dueAt: at(-1 * DAY), lateAllowed: true, lateUntil: at(2 * DAY) },
    },
    { label: "Geç teslim, son kabul yok", props: { publishAt: at(-7 * DAY), dueAt: at(-6 * HOUR), lateAllowed: true } },
    {
      label: "Geç teslim penceresi var, henüz süre dolmadı",
      props: { publishAt: at(-2 * DAY), dueAt: at(4 * DAY), lateAllowed: true, lateUntil: at(6 * DAY) },
    },
    { label: "Teslim edildi", props: { publishAt: at(-4 * DAY), dueAt: at(3 * DAY), submittedAt: at(-2 * HOUR) } },
    {
      label: "Geç teslim edildi",
      props: { publishAt: at(-8 * DAY), dueAt: at(-1 * DAY), lateAllowed: true, lateUntil: at(1 * DAY), submittedAt: at(-3 * HOUR) },
    },
    { label: "Zamanlanmış (eğitmen görünümü)", props: { publishAt: at(2 * DAY), dueAt: at(9 * DAY) } },
    { label: "Süresiz", props: { publishAt: at(-3 * DAY), dueAt: null } },
  ];

  const axis = { start: new Date(now), end: at(14 * DAY) };
  const upcoming = [
    { code: "BİL101", title: "Döngüler alıştırması", dueAt: at(20 * HOUR), publishAt: at(-5 * DAY) },
    { code: "MAT201", title: "Türev ödevi", dueAt: at(3 * DAY + 4 * HOUR), publishAt: at(-2 * DAY) },
    { code: "BİL101", title: "Proje önerisi", dueAt: at(9 * DAY), publishAt: at(-1 * DAY), lateAllowed: true, lateUntil: at(11 * DAY) },
    { code: "FİZ105", title: "Laboratuvar raporu", dueAt: at(13 * DAY), publishAt: at(-1 * DAY) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {states.map((s) => (
          <div key={s.label} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <p className="text-label font-medium text-ink-soft">{s.label}</p>
            <DeadlineRibbon {...s.props} serverNow={now} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        <p className="text-label font-medium text-ink-soft">Kompakt (listeler)</p>
        {states.slice(0, 5).map((s) => (
          <DeadlineRibbon key={s.label} {...s.props} serverNow={now} variant="compact" />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-label font-medium text-ink-soft">Yaklaşan teslimler · ortak eksen (bugün → +14 gün)</p>
          <span className="font-mono text-xs text-ink-soft">
            <DateTime value={axis.start} format="day" mono={false} /> → <DateTime value={axis.end} format="day" mono={false} />
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {upcoming.map((u) => (
            <li key={u.title} className="grid grid-cols-[minmax(0,180px)_1fr] items-center gap-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <CourseCodeBadge code={u.code} size="sm" />
                <span className="truncate text-sm text-ink">{u.title}</span>
              </div>
              <DeadlineRibbon
                publishAt={u.publishAt}
                dueAt={u.dueAt}
                lateAllowed={u.lateAllowed}
                lateUntil={u.lateUntil}
                serverNow={now}
                axis={axis}
                variant="compact"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const SAMPLE_MD = `## Ödev 2 · Döngüler

Bu haftaki alıştırmalarda **for** ve **while** döngülerini kullanacaksın.

1. 1'den 100'e kadar asal sayıları yazdır.
2. Kullanıcıdan alınan sayının basamaklarını topla.

> Teslimden sonra dosyayı değiştirme. Teslim zamanı kayıt altına alınır.

- [x] Drive'a yükle
- [ ] Paylaşım: *Bağlantıya sahip olan herkes*

\`\`\`python
for i in range(2, 101):
    print(i)
\`\`\`

| Kriter | Puan |
|---|---|
| Doğruluk | 60 |
| Okunabilirlik | 40 |

Ayrıntılar için [ders sayfası](https://example.com).`;
