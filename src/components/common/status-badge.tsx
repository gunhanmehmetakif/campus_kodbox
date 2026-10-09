import { CheckCircle2, Clock, Hourglass, Star, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SubmissionStatus = "submitted" | "late" | "pending" | "graded";

const STATUS_META: Record<SubmissionStatus, { label: string; icon: LucideIcon; className: string }> = {
  submitted: {
    label: "Teslim edildi",
    icon: CheckCircle2,
    className: "bg-status-submitted-bg text-status-submitted",
  },
  late: { label: "Gecikti", icon: Clock, className: "bg-status-late-bg text-status-late" },
  pending: { label: "Bekliyor", icon: Hourglass, className: "bg-status-pending-bg text-status-pending" },
  graded: { label: "Puanlandı", icon: Star, className: "bg-status-graded-bg text-status-graded" },
};

export const SUBMISSION_STATUSES = Object.keys(STATUS_META) as SubmissionStatus[];

type StatusBadgeProps = {
  status: SubmissionStatus;
  /** Overrides the default Turkish label. */
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { label: defaultLabel, icon: Icon, className: tone } = STATUS_META[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? defaultLabel}
    </span>
  );
}
