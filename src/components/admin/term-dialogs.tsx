"use client";

import { CheckCircle2, Loader2, Pencil, Plus } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { FieldError, FormError, fieldMessages, formError, useFocusOnError } from "@/components/auth/form-parts";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTermAction, setActiveTermAction, updateTermAction } from "@/server/admin/actions";

export type TermData = { id: string; name: string; startsOn: string | null; endsOn: string | null };

/** Create (no `term`) or edit (with `term`) dialog. */
export function TermFormDialog({ term }: { term?: TermData }) {
  const [open, setOpen] = useState(false);
  const editing = term !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" className="h-11 md:h-8">
            <Pencil aria-hidden="true" />
            Düzenle
            <span className="sr-only"> ({term.name})</span>
          </Button>
        ) : (
          <Button className="h-11 md:h-9">
            <Plus aria-hidden="true" />
            Dönem ekle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <TermForm term={term} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TermForm({ term, onDone }: { term?: TermData; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const nameId = useId();
  const startId = useId();
  const endId = useId();

  async function run(_prev: unknown, formData: FormData) {
    const result = term ? await updateTermAction(null, formData) : await createTermAction(null, formData);
    if (result.ok) {
      toast.success(term ? "Dönem güncellendi." : "Dönem eklendi.");
      onDone();
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(run, null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{term ? "Dönemi düzenle" : "Dönem ekle"}</DialogTitle>
        <DialogDescription>Tarihler isteğe bağlıdır.</DialogDescription>
      </DialogHeader>
      {term ? <input type="hidden" name="id" value={term.id} /> : null}
      <FormError message={formError(state)} />
      <div className="space-y-2">
        <Label htmlFor={nameId}>Dönem adı</Label>
        <Input
          id={nameId}
          name="name"
          defaultValue={term?.name}
          placeholder="2026-2027 Güz"
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!fieldMessages(state, "name") || undefined}
          aria-describedby={`${nameId}-error`}
          className="h-11 text-base md:text-sm"
        />
        <FieldError id={`${nameId}-error`} messages={fieldMessages(state, "name")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={startId}>Başlangıç</Label>
          <Input
            id={startId}
            name="startsOn"
            type="date"
            defaultValue={term?.startsOn ?? ""}
            disabled={pending}
            aria-invalid={!!fieldMessages(state, "startsOn") || undefined}
            aria-describedby={`${startId}-error`}
            className="h-11 text-base md:text-sm"
          />
          <FieldError id={`${startId}-error`} messages={fieldMessages(state, "startsOn")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={endId}>Bitiş</Label>
          <Input
            id={endId}
            name="endsOn"
            type="date"
            defaultValue={term?.endsOn ?? ""}
            disabled={pending}
            aria-invalid={!!fieldMessages(state, "endsOn") || undefined}
            aria-describedby={`${endId}-error`}
            className="h-11 text-base md:text-sm"
          />
          <FieldError id={`${endId}-error`} messages={fieldMessages(state, "endsOn")} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending} className="h-11 sm:h-8">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {term ? "Kaydet" : "Dönem ekle"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SetActiveTermButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="h-11 md:h-8">
          <CheckCircle2 aria-hidden="true" />
          Aktif yap
          <span className="sr-only"> ({name})</span>
        </Button>
      }
      title="Aktif dönem değişsin mi?"
      description={
        <>
          <strong>{name}</strong> aktif dönem olur. Yeni dersler varsayılan olarak bu döneme açılır; önceki dönemin dersleri
          silinmez.
        </>
      }
      confirmLabel="Aktif yap"
      successMessage="Aktif dönem güncellendi."
      action={setActiveTermAction}
      hiddenFields={{ id }}
    />
  );
}
