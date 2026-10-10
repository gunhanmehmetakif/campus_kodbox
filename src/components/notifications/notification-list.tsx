import { formatDistanceToNowStrict } from "date-fns";
import { tr } from "date-fns/locale";
import { Award, Clock, ClipboardList, GraduationCap, Megaphone, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationListItem } from "@/server/notifications/queries";
import { openNotificationAction } from "@/server/notifications/actions";

const ICONS: Record<NotificationListItem["icon"], LucideIcon> = {
  course: GraduationCap,
  post: Megaphone,
  assignment: ClipboardList,
  deadline: Clock,
  score: Award,
};

/** Each row is a form so opening (mark read + redirect) works without JavaScript. */
export function NotificationList({ items }: { items: NotificationListItem[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <li key={item.id}>
            <form action={openNotificationAction}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                className={cn(
                  "flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
                  !item.read && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                    item.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className={cn("block text-sm break-words", !item.read && "font-semibold")}>
                    {item.title}
                  </span>
                  {item.body ? (
                    <span className="block text-sm break-words text-muted-foreground">{item.body}</span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(item.createdAt, { addSuffix: true, locale: tr })}
                  </span>
                </span>
                {!item.read ? (
                  <>
                    <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span className="sr-only">Okunmamış</span>
                  </>
                ) : null}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
