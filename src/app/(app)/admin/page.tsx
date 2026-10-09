import type { Metadata } from "next";
import { BookOpen, CalendarRange, GraduationCap, History, School, Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Yönetim" };

const SECTIONS = [
  { href: "/admin/egitmenler", title: "Eğitmenler", description: "Hesap oluştur, şifre sıfırla.", icon: GraduationCap },
  { href: "/admin/dersler", title: "Dersler", description: "Dönem filtresi, toplu arşiv.", icon: BookOpen },
  { href: "/admin/ogrenciler", title: "Öğrenciler", description: "Maskeli arama.", icon: Users },
  { href: "/admin/donemler", title: "Dönemler", description: "Aktif dönemi seç.", icon: CalendarRange },
  { href: "/admin/okullar", title: "Okullar", description: "Mail alan adları, numara kuralı.", icon: School },
  { href: "/admin/denetim", title: "Denetim kaydı", description: "İşlem geçmişi.", icon: History },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Yönetim" description="Platformun hesap ve dönem ayarları." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl outline-none transition-shadow hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full">
              <CardHeader>
                <Icon className="mb-2 size-5 text-primary" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
