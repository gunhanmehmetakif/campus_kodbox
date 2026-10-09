import { KeyRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SectionPlaceholder } from "@/components/section-placeholder";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { maskEmail } from "@/lib/mask";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Hesabım" };

/** Hesap ayarları (tüm roller) — F1: şifre değiştirme, Google/Apple bağlama, oturumlar. */
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <SectionPlaceholder title="Hesabım" description="Giriş bilgilerin, bağlı hesapların ve görünüm tercihlerin." phase="F1">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Giriş bilgileri</CardTitle>
            <CardDescription>Okul mailinle giriş yapıyorsun.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="font-mono text-sm text-ink">{maskEmail(user.email)}</p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/sifre-degistir">
                <KeyRoundIcon data-icon="inline-start" />
                Şifreyi değiştir
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Görünüm</CardTitle>
            <CardDescription>Sistem ayarını izle veya açık/koyu temayı sabitle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle persist />
          </CardContent>
        </Card>
      </div>
    </SectionPlaceholder>
  );
}
