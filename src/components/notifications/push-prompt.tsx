"use client";

import { BellRing, Loader2, Smartphone, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { IOS_INSTALL_TEXT, usePush } from "./use-push";

const STORAGE_KEY = "kodbox.pushPrompt";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {
    // storage unavailable; the card simply reappears next visit
  }
}

/** Dismissible permission card for students. Hidden unless push can actually be enabled here. */
export function PushPrompt({ publicKey }: { publicKey: string | null }) {
  const { state, permission, busy, enable } = usePush(publicKey);
  const [dismissed, setDismissed] = useState(readDismissedLazy);

  if (!publicKey || dismissed) return null;
  const iosInstall = state === "ios-install";
  if (!iosInstall && !(state === "off" && permission === "default")) return null;

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  async function allow() {
    await enable();
    // granted or denied: either way the card has done its job
    setDismissed(true);
  }

  return (
    <Card className="mb-5 border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {iosInstall ? <Smartphone className="size-5" aria-hidden="true" /> : <BellRing className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          {iosInstall ? (
            <p className="text-sm">{IOS_INSTALL_TEXT}</p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Ödev hatırlatmaları için bildirimlere izin verin</p>
              <p className="text-sm text-muted-foreground">
                Son teslime 24 saat kala ve yeni ödev geldiğinde telefonunuza bildirim gelir.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {iosInstall ? null : (
              <Button type="button" onClick={allow} disabled={busy} className="h-11 text-sm">
                {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                İzin ver
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={dismiss} className="h-11 text-sm">
              {iosInstall ? "Anladım" : "Şimdi değil"}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Kapat"
          className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  );
}

function readDismissedLazy(): boolean {
  return typeof window === "undefined" ? false : readDismissed();
}
