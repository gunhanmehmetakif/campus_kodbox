"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deletePushSubscriptionAction, savePushSubscriptionAction } from "@/server/notifications/actions";

export type PushState =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "denied"
  | "off"
  | "on";

export const IOS_INSTALL_TEXT =
  "iPhone'da bildirim için önce ana ekrana ekleyin: Paylaş → Ana Ekrana Ekle, sonra uygulamayı oradan açın.";

function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function detect(): Promise<{ state: PushState; permission: NotificationPermission | null }> {
  if (isIos() && !isStandalone()) return { state: "ios-install", permission: null };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { state: "unsupported", permission: null };
  }
  const permission = Notification.permission;
  if (permission === "denied") return { state: "denied", permission };
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub && permission === "granted") return { state: "on", permission };
  } catch {
    // fall through to "off"
  }
  return { state: "off", permission };
}

/** Shared device-level push state and actions for the prompt and the account card. */
export function usePush(publicKey: string | null) {
  const [state, setState] = useState<PushState>("loading");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detect().then((result) => {
      if (cancelled) return;
      setState(result.state);
      setPermission(result.permission);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!publicKey || busy) return false;
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        if (result === "denied") setState("denied");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) throw new Error("incomplete subscription");
      const saved = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: { p256dh, auth } });
      if (!saved.ok) {
        await sub.unsubscribe().catch(() => false);
        toast.error(saved.error);
        return false;
      }
      setState("on");
      toast.success("Bildirimler açıldı");
      return true;
    } catch {
      toast.error("Bildirimler açılamadı, tekrar deneyin.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [publicKey, busy]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const removed = await deletePushSubscriptionAction({ endpoint });
        if (!removed.ok) toast.error(removed.error);
      }
      setState("off");
      toast.success("Bildirimler kapatıldı");
      return true;
    } catch {
      toast.error("Bildirimler kapatılamadı, tekrar deneyin.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { state, permission, busy, enable, disable };
}
