"use client";

import { Ban, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { TempPasswordDialog } from "@/components/admin/temp-password-dialog";
import { FieldError, FormError, fieldMessages, formError, useFocusOnError } from "@/components/auth/form-parts";
import { SchoolEmailInput } from "@/components/auth/school-email-input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInstructorAction,
  resetInstructorPasswordAction,
  setUserStatusAction,
  updateInstructorAction,
} from "@/server/admin/actions";

type PasswordReveal = { password: string; subject: string; title: string };

export function CreateInstructorButton() {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState<PasswordReveal | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-11 md:h-9">
            <Plus aria-hidden="true" />
            Eğitmen ekle
          </Button>
        </DialogTrigger>
        <DialogContent>
          <CreateInstructorForm
            onCreated={(password, name) => {
              setOpen(false);
              setReveal({ password, subject: name, title: "Eğitmen hesabı oluşturuldu" });
            }}
          />
        </DialogContent>
      </Dialog>
      <TempPasswordDialog
        password={reveal?.password ?? null}
        title={reveal?.title ?? ""}
        subject={reveal?.subject}
        onClose={() => setReveal(null)}
      />
    </>
  );
}

function CreateInstructorForm({ onCreated }: { onCreated: (password: string, name: string) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [local, setLocal] = useState("");
  const nameId = useId();
  const localId = useId();

  async function run(_prev: Awaited<ReturnType<typeof createInstructorAction>> | null, formData: FormData) {
    const result = await createInstructorAction(_prev, formData);
    if (result.ok) {
      const name = String(formData.get("displayName") ?? "").trim();
      onCreated(result.data.tempPassword, name);
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(run, null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Eğitmen ekle</DialogTitle>
        <DialogDescription>
          Hesap oluşturulunca eğitmene iletmeniz için bir kerelik geçici şifre gösterilir.
        </DialogDescription>
      </DialogHeader>
      <FormError message={formError(state)} />
      <div className="space-y-2">
        <Label htmlFor={localId}>Okul maili</Label>
        <SchoolEmailInput
          id={localId}
          name="local"
          audience="staff"
          value={local}
          onValueChange={setLocal}
          disabled={pending}
          invalid={!!fieldMessages(state, "local")}
          describedBy={`${localId}-error`}
        />
        <FieldError id={`${localId}-error`} messages={fieldMessages(state, "local")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={nameId}>Görünen ad</Label>
        <Input
          id={nameId}
          name="displayName"
          autoComplete="off"
          placeholder="Ahmet Yılmaz"
          disabled={pending}
          aria-invalid={!!fieldMessages(state, "displayName") || undefined}
          aria-describedby={`${nameId}-error`}
          className="h-11 text-base md:text-sm"
        />
        <FieldError id={`${nameId}-error`} messages={fieldMessages(state, "displayName")} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending} className="h-11 sm:h-8">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Hesap oluştur
        </Button>
      </DialogFooter>
    </form>
  );
}

export type InstructorRowData = {
  id: string;
  displayName: string;
  status: "active" | "disabled";
};

type Dialogs = "edit" | "reset" | "status" | null;

/** Per-row menu: edit, reset password, disable / enable. */
export function InstructorRowActions({ instructor }: { instructor: InstructorRowData }) {
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [reveal, setReveal] = useState<PasswordReveal | null>(null);
  const disabled = instructor.status === "disabled";
  const close = (open: boolean) => (open ? undefined : setDialog(null));

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="size-11 md:size-8">
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">{instructor.displayName} için işlemler</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="min-h-11 md:min-h-0" onSelect={() => setDialog("edit")}>
            <Pencil aria-hidden="true" />
            Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 md:min-h-0" onSelect={() => setDialog("reset")}>
            <KeyRound aria-hidden="true" />
            Şifre sıfırla
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={disabled ? "default" : "destructive"}
            className="min-h-11 md:min-h-0"
            onSelect={() => setDialog("status")}
          >
            {disabled ? <ShieldCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
            {disabled ? "Etkinleştir" : "Devre dışı bırak"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "edit"} onOpenChange={close}>
        <DialogContent>
          <EditInstructorForm instructor={instructor} onDone={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "reset"}
        onOpenChange={close}
        title="Şifre sıfırlansın mı?"
        description={
          <>
            <strong>{instructor.displayName}</strong> için yeni bir geçici şifre oluşturulur. Açık tüm oturumları
            kapanır ve ilk girişte şifresini değiştirmesi istenir.
          </>
        }
        confirmLabel="Şifreyi sıfırla"
        successMessage=""
        action={resetInstructorPasswordAction}
        hiddenFields={{ id: instructor.id }}
        onDone={(result) => {
          if (result.ok) {
            setReveal({ password: result.data.tempPassword, subject: instructor.displayName, title: "Şifre sıfırlandı" });
          }
        }}
      />

      <ConfirmDialog
        open={dialog === "status"}
        onOpenChange={close}
        title={disabled ? "Hesap etkinleştirilsin mi?" : "Hesap devre dışı bırakılsın mı?"}
        description={
          disabled ? (
            <>
              <strong>{instructor.displayName}</strong> yeniden giriş yapabilir.
            </>
          ) : (
            <>
              <strong>{instructor.displayName}</strong> giriş yapamaz ve açık oturumları kapanır. Dersleri ve verileri
              silinmez.
            </>
          )
        }
        confirmLabel={disabled ? "Etkinleştir" : "Devre dışı bırak"}
        destructive={!disabled}
        successMessage={disabled ? "Hesap etkinleştirildi." : "Hesap devre dışı bırakıldı."}
        action={setUserStatusAction}
        hiddenFields={{ id: instructor.id, status: disabled ? "active" : "disabled" }}
      />

      <TempPasswordDialog
        password={reveal?.password ?? null}
        title={reveal?.title ?? ""}
        subject={reveal?.subject}
        onClose={() => setReveal(null)}
      />
    </>
  );
}

function EditInstructorForm({ instructor, onDone }: { instructor: InstructorRowData; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const nameId = useId();

  async function run(prev: Awaited<ReturnType<typeof updateInstructorAction>> | null, formData: FormData) {
    const result = await updateInstructorAction(prev, formData);
    if (result.ok) {
      toast.success("Eğitmen güncellendi.");
      onDone();
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(run, null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Eğitmeni düzenle</DialogTitle>
        <DialogDescription>Mail adresi değiştirilemez; yalnız görünen ad güncellenir.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={instructor.id} />
      <FormError message={formError(state)} />
      <div className="space-y-2">
        <Label htmlFor={nameId}>Görünen ad</Label>
        <Input
          id={nameId}
          name="displayName"
          defaultValue={instructor.displayName}
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!fieldMessages(state, "displayName") || undefined}
          aria-describedby={`${nameId}-error`}
          className="h-11 text-base md:text-sm"
        />
        <FieldError id={`${nameId}-error`} messages={fieldMessages(state, "displayName")} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending} className="h-11 sm:h-8">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}
