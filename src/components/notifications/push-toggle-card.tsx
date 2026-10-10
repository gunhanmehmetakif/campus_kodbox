"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { IOS_INSTALL_TEXT, usePush } from "./use-push";

type PushToggleCardProps = {
  publicKey: string | null;
  /** Short form for the notifications page: only shown while permission can still be asked. */
  compact?: boolean;
};

/** Device-level push switch for students (account page and notifications page). */
export function PushToggleCard({ publicKey, compact = false }: PushToggleCardProps) {
  const { state, permission, busy, enable, disable } = usePush(publicKey);

  if (!publicKey || state === "loading") return null;
  if (compact) {
    const askable = state === "off" && permission === "default";
    if (!askable && state !== "ios-install") return null;
  }

  let content: React.ReactNode;
  switch (state) {
    case "unsupported":
      content = <p className="text-sm text-muted-foreground">Bu tarayıcı bildirim desteklemiyor.</p>;
      break;
    case "ios-install":
      content = <p className="text-sm">{IOS_INSTALL_TEXT}</p>;
      break;
    case "denied":
      content = <p className="text-sm text-muted-foreground">Bildirim izni tarayıcı ayarlarından kapatılmış.</p>;
      break;
    case "on":
      content = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Bu cihazda bildirimler açık.</p>
          <Button type="button" variant="outline" onClick={disable} disabled={busy} className="h-11 w-full text-sm sm:w-auto">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Kapat
          </Button>
        </div>
      );
      break;
    default:
      content = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Bu cihazda bildirimler kapalı.</p>
          <Button type="button" onClick={enable} disabled={busy} className="h-11 w-full text-sm sm:w-auto">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Aç
          </Button>
        </div>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telefon bildirimleri</CardTitle>
        <CardDescription>Bu cihaz için. Site içi bildirimler her zaman açıktır.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
