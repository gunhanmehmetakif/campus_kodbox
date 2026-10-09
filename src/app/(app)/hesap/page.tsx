import type { Metadata } from "next";
import { UserCog } from "lucide-react";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = { title: "Hesap" };

export default function AccountPage() {
  return (
    <PlaceholderPage
      title="Hesap"
      description="Şifre, Google bağlantısı ve bildirim tercihleri."
      emptyTitle="Hesap ayarları yakında"
      emptyDescription="Bu bölüm kimlik aşamasında (F1) doldurulacak."
      icon={UserCog}
    />
  );
}
