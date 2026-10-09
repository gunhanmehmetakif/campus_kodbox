import type { Metadata } from "next";
import { BookOpen, CalendarRange, GraduationCap, History, TriangleAlert, UserPlus, Users, School } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminDashboard } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Yönetim" };

const LINKS = [
  { href: "/admin/dersler", title: "Dersler", icon: BookOpen },
  { href: "/admin/ogrenciler", title: "Öğrenciler", icon: Users },
  { href: "/admin/okullar", title: "Okul ayarları", icon: School },
  { href: "/admin/denetim", title: "Denetim kaydı", icon: History },
];

async function DashboardContent() {
  const data = await getAdminDashboard();
  const counters = [
    { label: "Eğitmen", value: data.instructorCount, icon: GraduationCap, href: "/admin/egitmenler" },
    { label: "Aktif öğrenci", value: data.activeStudentCount, icon: Users, href: "/admin/ogrenciler" },
    { label: "Aktif ders", value: data.activeCourseCount, icon: BookOpen, href: "/admin/dersler" },
    {
      label: "Aktif dönem",
      value: data.activeTerm?.name ?? "Yok",
      icon: CalendarRange,
      href: "/admin/donemler",
    },
  ];

  return (
    <>
      {data.activeTerm ? null : (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-status-pending-bg px-4 py-3 text-sm text-status-pending">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Aktif dönem yok. Eğitmenlerin ders açabilmesi için bir dönem tanımlayın.</span>
          <Button asChild variant="outline" className="h-11 md:h-8">
            <Link href="/admin/donemler">Dönem tanımlayın</Link>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counters.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl outline-none transition-shadow hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full">
              <CardHeader>
                <Icon className="mb-1 size-5 text-primary" aria-hidden="true" />
                <CardDescription>{label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={typeof value === "number" ? "font-heading text-3xl font-semibold tabular-nums" : "font-heading text-xl font-semibold break-words"}>
                  {value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Yönetim"
        description="Platformun hesap ve dönem ayarları."
        actions={
          <>
            <Button asChild className="h-11 md:h-9">
              <Link href="/admin/egitmenler">
                <UserPlus aria-hidden="true" />
                Eğitmen ekle
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 md:h-9">
              <Link href="/admin/donemler">
                <CalendarRange aria-hidden="true" />
                Dönemler
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Diğer bölümler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map(({ href, title, icon: Icon }) => (
            <Button key={href} asChild variant="ghost" className="h-11 justify-start">
              <Link href={href}>
                <Icon aria-hidden="true" />
                {title}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
