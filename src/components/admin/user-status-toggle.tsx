"use client";

import { Ban, ShieldCheck } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { setUserStatusAction } from "@/server/admin/actions";

type UserStatusToggleProps = {
  id: string;
  status: "active" | "disabled";
  /** Display label of the user, e.g. the masked student number. */
  label: string;
};

/** Disable / enable button with a confirmation dialog. */
export function UserStatusToggle({ id, status, label }: UserStatusToggleProps) {
  const disabled = status === "disabled";

  return (
    <ConfirmDialog
      trigger={
        <Button variant={disabled ? "outline" : "ghost"} className="h-11 md:h-8">
          {disabled ? <ShieldCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
          {disabled ? "Etkinleştir" : "Devre dışı bırak"}
          <span className="sr-only"> ({label})</span>
        </Button>
      }
      title={disabled ? "Hesap etkinleştirilsin mi?" : "Hesap devre dışı bırakılsın mı?"}
      description={
        disabled ? (
          <>
            <strong className="font-mono">{label}</strong> yeniden giriş yapabilir.
          </>
        ) : (
          <>
            <strong className="font-mono">{label}</strong> giriş yapamaz ve açık oturumları kapanır. Ders kayıtları silinmez.
          </>
        )
      }
      confirmLabel={disabled ? "Etkinleştir" : "Devre dışı bırak"}
      destructive={!disabled}
      successMessage={disabled ? "Hesap etkinleştirildi." : "Hesap devre dışı bırakıldı."}
      action={setUserStatusAction}
      hiddenFields={{ id, status: disabled ? "active" : "disabled" }}
    />
  );
}
