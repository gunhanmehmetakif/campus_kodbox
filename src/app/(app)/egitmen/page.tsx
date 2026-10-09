import { BookOpenIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Panel" };

/** Eğitmen paneli — F3/F4 dolduracak: derslerim, kontrol bekleyen teslimler. */
export default async function InstructorHomePage() {
  const user = await requireRole("instructor");
  return (
    <SectionPlaceholder
      title={user.displayName ? `Hoş geldiniz, ${user.displayName}` : "Hoş geldiniz"}
      description="Dersleriniz ve kontrol bekleyen teslimler burada."
      phase="F3"
    >
      <EmptyState
        icon={BookOpenIcon}
        title="Henüz ders yok"
        description="İlk dersinizi oluşturup öğrencilerinizi ekleyin."
        action={
          <Button asChild>
            <Link href="/egitmen/dersler">Ders oluştur</Link>
          </Button>
        }
      />
    </SectionPlaceholder>
  );
}
