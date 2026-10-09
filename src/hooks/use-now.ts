"use client";

import { useSyncExternalStore } from "react";

/**
 * Paylaşılan "şimdi" saati. Sayfadaki tüm sayaçlar TEK zamanlayıcıyı paylaşır.
 *
 * - "minute": dakika sınırlarında güncellenir (varsayılan; DESIGN.md: sayaç dakikada bir).
 * - "second": saniyede bir (son 1 saat).
 *
 * Hydration: sunucuda ve hydration sırasında `serverNow` döner (yoksa null). Sunucu
 * bileşeni `Date.now()`'ı prop olarak geçirirse ilk HTML'de doğru sayaç görünür ve
 * hydration uyuşmazlığı olmaz; ardından istemci saati devralır.
 */
export type NowGranularity = "minute" | "second";

const STEP: Record<NowGranularity, number> = { minute: 60_000, second: 1_000 };

const listeners: Record<NowGranularity, Set<() => void>> = { minute: new Set(), second: new Set() };
let current = Date.now();
let timer: ReturnType<typeof setTimeout> | null = null;

function hasListeners() {
  return listeners.minute.size > 0 || listeners.second.size > 0;
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!hasListeners()) return;
  const step = listeners.second.size > 0 ? STEP.second : STEP.minute;
  const now = Date.now();
  timer = setTimeout(tick, step - (now % step) + 15);
}

function tick() {
  current = Date.now();
  for (const l of listeners.second) l();
  for (const l of listeners.minute) l();
  schedule();
}

function makeSubscribe(granularity: NowGranularity) {
  return (listener: () => void) => {
    if (!hasListeners()) current = Date.now();
    listeners[granularity].add(listener);
    schedule();
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners[granularity].delete(listener);
      document.removeEventListener("visibilitychange", onVisible);
      schedule();
    };
  };
}

const subscribers: Record<NowGranularity, (l: () => void) => () => void> = {
  minute: makeSubscribe("minute"),
  second: makeSubscribe("second"),
};

const snapshots: Record<NowGranularity, () => number> = {
  minute: () => {
    if (!hasListeners()) current = Date.now();
    return Math.floor(current / STEP.minute) * STEP.minute;
  },
  second: () => {
    if (!hasListeners()) current = Date.now();
    return Math.floor(current / STEP.second) * STEP.second;
  },
};

/**
 * @param granularity güncelleme sıklığı
 * @param serverNow sunucuda hesaplanan an (ms). SSR + hydration'da bu değer kullanılır.
 * @returns şimdiki zaman (ms) veya — sunucuda `serverNow` verilmediyse — null.
 */
export function useNow(granularity: NowGranularity = "minute", serverNow?: number | null): number | null {
  return useSyncExternalStore(subscribers[granularity], snapshots[granularity], () => serverNow ?? null);
}
