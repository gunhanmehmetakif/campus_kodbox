"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TempPasswordDialogProps = {
  /** The dialog is open while a password is set; it lives only in client state. */
  password: string | null;
  title: string;
  /** Whose password it is (shown in the description). */
  subject?: string;
  onClose: () => void;
};

/** One-time temporary password display with a copy button. */
export function TempPasswordDialog({ password, title, subject, onClose }: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  function close() {
    setCopied(false);
    onClose();
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Şifre kopyalandı.");
    } catch {
      toast.error("Kopyalanamadı, şifreyi elle seçip kopyalayın.");
    }
  }

  return (
    <Dialog open={password !== null} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subject ? `${subject} için geçici şifre oluşturuldu.` : "Geçici şifre oluşturuldu."} İlk girişte şifresini
            değiştirmesi istenecek.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code
            aria-label="Geçici şifre"
            className="min-w-0 flex-1 rounded-lg border bg-muted px-3 py-2.5 text-center font-mono text-lg font-semibold tracking-wider break-all select-all"
          >
            {password}
          </code>
          <Button type="button" variant="outline" className="size-11" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span className="sr-only">Şifreyi kopyala</span>
          </Button>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2.5 text-sm text-status-pending">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Bu şifre bir daha gösterilmeyecek, eğitmene iletin.
        </p>
        <DialogFooter>
          <Button type="button" className="h-11 sm:h-8" onClick={close}>
            Tamam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
