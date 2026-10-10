import { Bell } from "lucide-react";
import Link from "next/link";

type NotificationBellProps = {
  /** Unread notification count. */
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const label = count > 0 ? `Bildirimler, ${count} okunmamış` : "Bildirimler";
  return (
    <Link
      href="/bildirimler"
      aria-label={label}
      className="relative flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Bell className="size-5" aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4.5 font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
