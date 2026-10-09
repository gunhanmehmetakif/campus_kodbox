import { BellIcon } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Bildirimler" };

/** Tüm bildirimler listesi — F6. */
export default async function NotificationsPage() {
  await requireUser();
  return (
    <SectionPlaceholder
      title="Bildirimler"
      description="Ders, ödev ve puan bildirimlerin."
      phase="F6"
      icon={BellIcon}
      emptyTitle="Yeni bildirim yok"
      emptyDescription="Yeni bir duyuru, ödev veya puan yayınlandığında burada görünür."
    />
  );
}
