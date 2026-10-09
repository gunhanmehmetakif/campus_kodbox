"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Üst bardaki bildirim zili (PLAN.md §6). Okunmamış sayısı rozetle gösterilir.
 * F0: sayaç + boş liste kabı. F6 bildirim listesini (`items`) ve "okundu" eylemlerini bağlar.
 */
export type BellItem = { id: string; title: string; description?: string; href?: string; unread: boolean; at: string };

export function NotificationBell({
  unreadCount,
  items = [],
}: {
  unreadCount: number;
  items?: BellItem[];
}) {
  const [open, setOpen] = useState(false);
  const label = unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : "Bildirimler";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <BellIcon />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brick px-1 font-mono text-xs leading-none font-semibold text-on-accent ring-2 ring-paper"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-display text-sm font-semibold text-ink">Bildirimler</p>
          {unreadCount > 0 ? <span className="text-xs text-ink-soft">{unreadCount} okunmamış</span> : null}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOffIcon className="size-5 text-ink-soft" aria-hidden />
            <p className="text-sm text-ink-soft">Yeni bildirim yok.</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href ?? "/bildirimler"}
                  onClick={() => setOpen(false)}
                  className={cn("flex gap-3 px-4 py-2.5 transition-colors hover:bg-paper", item.unread && "bg-laurel-tint/40")}
                >
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.unread ? "bg-laurel" : "bg-transparent")}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-ink">{item.title}</span>
                    {item.description ? <span className="line-clamp-2 text-label text-ink-soft">{item.description}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/bildirimler" onClick={() => setOpen(false)}>
              Tüm bildirimleri gör
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
