"use client";

import { Archive } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { archiveTermCoursesAction } from "@/server/admin/actions";

type ArchiveTermButtonProps = {
  termId: string;
  termName: string;
  /** Number of non-archived courses that will be archived. */
  count: number;
};

export function ArchiveTermButton({ termId, termName, count }: ArchiveTermButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="h-11 md:h-9" disabled={count === 0}>
          <Archive aria-hidden="true" />
          Bu dönemin tüm derslerini arşivle
        </Button>
      }
      title="Dönemin dersleri arşivlensin mi?"
      description={
        <>
          <strong>{termName}</strong> döneminin arşivlenmemiş <strong>{count}</strong> dersi arşivlenecek. Arşivli
          derslerde değişiklik yapılamaz; eğitmenler dersleri tek tek arşivden çıkarabilir.
        </>
      }
      confirmLabel={`${count} dersi arşivle`}
      destructive
      successMessage="Dönemin dersleri arşivlendi."
      action={archiveTermCoursesAction}
      hiddenFields={{ id: termId }}
    />
  );
}
