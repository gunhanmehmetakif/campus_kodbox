"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive, type Role } from "./nav-items";

const itemClass =
  "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";

/** Mobile bottom bar (below md). Non-primary items collapse into a "Daha" menu. */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const primary = items.filter((i) => i.primary);
  const more = items.filter((i) => !i.primary);

  return (
    <nav
      aria-label="Alt menü"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {primary.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(itemClass, active && "text-primary")}
          >
            <item.icon className="size-5" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      {more.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={itemClass}>
            <Ellipsis className="size-5" aria-hidden="true" />
            <span>Daha</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-44">
            {more.map((item) => (
              <DropdownMenuItem key={item.href} asChild className="min-h-11">
                <Link href={item.href}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
