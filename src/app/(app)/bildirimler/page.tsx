import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Bildirimler" };

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Bildirimler"
      description="Duyuru, ödev ve puan bildirimleriniz."
      emptyTitle="Henüz bildiriminiz yok"
      emptyDescription="Yeni bir gelişme olduğunda burada göreceksiniz."
      icon={Bell}
    />
  );
}
