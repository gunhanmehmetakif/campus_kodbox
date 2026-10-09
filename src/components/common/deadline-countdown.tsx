"use client";

import { formatDistanceStrict } from "date-fns";
import { tr } from "date-fns/locale";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type DeadlineCountdownProps = {
  /** Due date; null means no deadline ("Süresiz"). */
  dueAt: Date | string | null;
  /** Already handed in: never rendered as overdue/urgent. */
  submitted?: boolean;
  className?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const absoluteFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

/**
 * Remaining time until a deadline. The relative text is computed only after mount (the server
 * has no stable "now"), so the first paint shows the absolute date in a fixed timezone.
 */
export function DeadlineCountdown({ dueAt, submitted = false, className }: DeadlineCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (dueAt === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>Süresiz</span>;
  }

  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const absolute = absoluteFormatter.format(due);

  if (now === null) {
    return (
      <time dateTime={due.toISOString()} className={cn("text-sm text-muted-foreground", className)}>
        {absolute}
      </time>
    );
  }

  const diff = due.getTime() - now;
  const overdue = diff < 0;
  const urgent = !overdue && diff < DAY_MS;
  const distance = formatDistanceStrict(due, now, { locale: tr, roundingMethod: "floor" });

  return (
    <time
      dateTime={due.toISOString()}
      title={absolute}
      className={cn(
        "text-sm font-medium",
        submitted && "text-muted-foreground",
        !submitted && overdue && "text-destructive",
        !submitted && urgent && "text-status-pending",
        className,
      )}
    >
      {submitted ? absolute : overdue ? `${distance} gecikti` : `${distance} kaldı`}
    </time>
  );
}
