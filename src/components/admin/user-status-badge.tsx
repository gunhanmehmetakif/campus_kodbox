import { Ban, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Account status chip (icon + text, never color alone). */
export function UserStatusBadge({ status }: { status: "active" | "disabled" }) {
  const active = status === "active";
  const Icon = active ? CheckCircle2 : Ban;
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        active ? "bg-status-submitted-bg text-status-submitted" : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {active ? "Aktif" : "Devre dışı"}
    </span>
  );
}
