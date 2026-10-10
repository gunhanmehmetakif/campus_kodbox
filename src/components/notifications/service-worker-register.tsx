"use client";

import { useEffect } from "react";

/** Registers the service worker once; renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // registration is best effort (private mode, blocked, etc.)
    });
  }, []);
  return null;
}
