"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SubmissionCard } from "@/components/assignments/student/submission-card";
import { SubmissionHistory } from "@/components/assignments/student/submission-history";
import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type SubmissionDialogProps = {
  assignmentId: string;
  title: string;
  dueAt: Date | null;
  windowState: "open" | "late";
  allowAnyLink: boolean;
  latePenalty: { type: "none" | "points" | "percent"; value: number | null };
  submission: null | {
    url: string;
    submittedAt: Date;
    isLate: boolean;
    history: Array<{ url: string; submittedAt: Date; isLate: boolean }>;
  };
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
  /** Opens on first render (deep link `?odev=`). */
  defaultOpen?: boolean;
};

/** Submission form in a dialog; a bottom sheet below 640px. */
export function SubmissionDialog({
  assignmentId,
  title,
  dueAt,
  windowState,
  allowAnyLink,
  latePenalty,
  submission,
  triggerLabel,
  triggerVariant = "default",
  defaultOpen = false,
}: SubmissionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} className="h-12 w-full sm:h-11 sm:w-auto">
          <Send aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="top-auto bottom-0 left-0 max-h-[90dvh] max-w-none translate-x-0 translate-y-0 content-start gap-3 overflow-y-auto rounded-b-none pb-6 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-b-xl"
      >
        <div className="space-y-1 pr-8">
          <DialogTitle className="text-base leading-snug break-words">{title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2">
            Son teslim:
            <DeadlineCountdown dueAt={dueAt} className="text-sm" />
          </DialogDescription>
        </div>
        <SubmissionCard
          assignmentId={assignmentId}
          windowState={windowState}
          allowAnyLink={allowAnyLink}
          latePenalty={latePenalty}
          locked={false}
          submission={
            submission
              ? { url: submission.url, submittedAt: submission.submittedAt, isLate: submission.isLate }
              : null
          }
          startEditing={submission !== null}
          onSubmitted={() => {
            setOpen(false);
            toast.success("Teslim edildi.");
            router.refresh();
          }}
        />
        {submission ? <SubmissionHistory history={submission.history} /> : null}
      </DialogContent>
    </Dialog>
  );
}
