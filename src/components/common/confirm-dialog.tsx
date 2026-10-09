"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { FormError, formError } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action";

type ConfirmDialogProps<T> = {
  /** Element that opens the dialog (rendered with `asChild`). Omit when the dialog is controlled. */
  trigger?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
  hiddenFields?: Record<string, string>;
  /** Runs after a successful action, before the dialog closes. */
  onDone?: (result: ActionResult<T>) => void;
  /** Toast text on success. Defaults to a generic message; pass "" to show no toast. */
  successMessage?: string;
  /** Controlled mode (e.g. opened from a dropdown menu item). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Confirmation dialog that runs a server action: pending state, error box, toast and auto-close on success. */
export function ConfirmDialog<T>({ trigger, open, onOpenChange, ...rest }: ConfirmDialogProps<T>) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;

  function setOpen(next: boolean) {
    setInnerOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <ConfirmForm {...rest} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type ConfirmFormProps<T> = Omit<ConfirmDialogProps<T>, "trigger" | "open" | "onOpenChange"> & {
  onClose: () => void;
};

function ConfirmForm<T>({
  title,
  description,
  confirmLabel,
  destructive,
  action,
  hiddenFields,
  onDone,
  successMessage = "İşlem tamamlandı.",
  onClose,
}: ConfirmFormProps<T>) {
  async function run(prev: ActionResult<T> | null, formData: FormData) {
    const result = await action(prev, formData);
    if (result.ok) {
      if (successMessage) toast.success(successMessage);
      onDone?.(result);
      onClose();
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(run, null);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div>{description}</div>
        </DialogDescription>
      </DialogHeader>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      <FormError message={formError(state)} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" className="h-11 sm:h-8" disabled={pending}>
            Vazgeç
          </Button>
        </DialogClose>
        <Button type="submit" variant={destructive ? "destructive" : "default"} className="h-11 sm:h-8" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
