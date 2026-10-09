import type { Metadata } from "next";
import Link from "next/link";

import { NAV } from "@/components/app-shell/nav";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Genel bakış" };

/** Yönetim genel bakış — F2 dolduracak (sayılar, son denetim kayıtları). */
export default async function AdminHomePage() {
  await requireRole("admin");
  const sections = NAV.admin.flatMap((s) => s.items).filter((i) => i.href !== "/admin");
  return (
    <SectionPlaceholder title="Genel bakış" description="Platform yönetimi: eğitmenler, dersler, öğrenciler ve okul ayarları." phase="F2">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-paper"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-laurel-tint text-laurel">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-medium text-ink">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionPlaceholder>
  );
}
