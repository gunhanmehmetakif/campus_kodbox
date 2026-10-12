"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteAssignmentAction } from "@/server/assignments/actions";

type DeleteAssignmentButtonProps = {
  assignmentId: string;
  title: string;
  courseId: string;
  submittedCount: number;
};

export function DeleteAssignmentButton({ assignmentId, title, courseId, submittedCount }: DeleteAssignmentButtonProps) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" className="h-11 text-destructive hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Sil
        </Button>
      }
      title="Ödevi sil"
      description={
        <>
          &ldquo;{title}&rdquo; kalıcı olarak silinecek.
          {submittedCount > 0 ? ` ${submittedCount} teslim de silinecek.` : ""}
        </>
      }
      confirmLabel="Sil"
      destructive
      successMessage="Ödev silindi."
      action={deleteAssignmentAction}
      hiddenFields={{ id: assignmentId }}
      onDone={() => router.replace(`/egitmen/dersler/${courseId}?filtre=odev`)}
    />
  );
}
