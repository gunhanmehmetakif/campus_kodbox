import { BookOpenIcon, CalendarClockIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Panel" };

/** Öğrenci paneli — F5 dolduracak: yaklaşan teslimler (ortak eksenli şeritler), derslerim, son duyurular. */
export default async function StudentHomePage() {
  await requireRole("student");
  return (
    <SectionPlaceholder title="Panelim" description="Yaklaşan teslimlerin, derslerin ve son duyurular burada." phase="F5">
      <div className="flex flex-col gap-8">
        <section aria-labelledby="yaklasan" className="flex flex-col gap-3">
          <h2 id="yaklasan" className="text-base font-semibold">Yaklaşan teslimler</h2>
          <EmptyState
            icon={CalendarClockIcon}
            title="Yaklaşan teslimin yok"
            description="Bir ödev yayınlandığında son tarihi ve kalan süresi burada görünür."
          />
        </section>
        <section aria-labelledby="derslerim" className="flex flex-col gap-3">
          <h2 id="derslerim" className="text-base font-semibold">Derslerim</h2>
          <EmptyState
            icon={BookOpenIcon}
            size="sm"
            title="Henüz bir derse eklenmedin"
            description="Eğitmenin seni derse eklediğinde ders burada otomatik görünür."
          />
        </section>
      </div>
    </SectionPlaceholder>
  );
}
