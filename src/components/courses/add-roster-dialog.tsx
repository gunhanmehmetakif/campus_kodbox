"use client";

import { AlertTriangle, Check, Equal, RefreshCw, UserPlus, X } from "lucide-react";
import { useActionState, useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FieldError, FormError, SubmitButton, fieldMessages, formError } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addRosterAction } from "@/server/courses/actions";
import { ROSTER_MAX_NUMBERS, parseRosterText } from "@/server/courses/roster-parse";

type AddRosterDialogProps = {
  courseId: string;
  studentNoRegex: string;
  trigger?: React.ReactNode;
};

const SHOWN_INVALID = 12;

/** Paste-a-list dialog with live preview. The most used instructor flow: keep it fast. */
export function AddRosterDialog({ courseId, studentNoRegex, trigger }: AddRosterDialogProps) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-11">
            <UserPlus aria-hidden="true" />
            Öğrenci ekle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Öğrenci ekle</DialogTitle>
          <DialogDescription>
            OBS&apos;den kopyaladığınız listeyi yapıştırın. Numara, isterseniz yanında ad soyad.
          </DialogDescription>
        </DialogHeader>
        <RosterForm
          key={round}
          courseId={courseId}
          studentNoRegex={studentNoRegex}
          onClose={() => setOpen(false)}
          onAnother={() => setRound((n) => n + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}

type RosterFormProps = {
  courseId: string;
  studentNoRegex: string;
  onClose: () => void;
  onAnother: () => void;
};

function RosterForm({ courseId, studentNoRegex, onClose, onAnother }: RosterFormProps) {
  const [state, formAction] = useActionState(addRosterAction, null);
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const preview = useMemo(() => parseRosterText(deferred, studentNoRegex), [deferred, studentNoRegex]);

  useEffect(() => {
    if (state?.ok) toast.success(`${state.data.added} öğrenci eklendi.`, { id: "roster-added" });
  }, [state]);

  if (state?.ok) {
    return <RosterSummary result={state.data} onClose={onClose} onAnother={onAnother} />;
  }

  const textErrors = fieldMessages(state, "text");
  const total = preview.valid.length + preview.invalid.length;
  const capped = total >= ROSTER_MAX_NUMBERS;
  const hasText = deferred.trim().length > 0;

  return (
    <form action={formAction} noValidate className="space-y-3">
      <FormError message={formError(state)} />
      <input type="hidden" name="courseId" value={courseId} />
      <Textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Öğrenci listesi"
        aria-invalid={textErrors?.length ? true : undefined}
        aria-describedby="roster-preview"
        placeholder={"2601234567 Ayşe Yılmaz\n2601234568 Mehmet Demir\n2601234569"}
        spellCheck={false}
        autoComplete="off"
        autoFocus
        className="max-h-[40dvh] min-h-44 font-mono"
      />
      <FieldError id="roster-text-error" messages={textErrors} />

      <div id="roster-preview" aria-live="polite" className="space-y-2 text-sm">
        {hasText ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <span className="text-status-submitted">{preview.valid.length} geçerli</span>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className={preview.invalid.length > 0 ? "text-destructive" : "text-muted-foreground"}>
                {preview.invalid.length} geçersiz
              </span>
            </p>
            {capped ? (
              <p className="flex items-start gap-1.5 text-status-pending">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Tek seferde en fazla {ROSTER_MAX_NUMBERS} numara işlenir; fazlası atlanır.
              </p>
            ) : null}
            {preview.invalid.length > 0 ? (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                <p className="mb-1 text-xs font-medium">Eklenmeyecek satırlar</p>
                <ul className="space-y-0.5 font-mono text-xs break-all">
                  {preview.invalid.slice(0, SHOWN_INVALID).map((line, i) => (
                    <li key={`${i}-${line}`}>{line}</li>
                  ))}
                </ul>
                {preview.invalid.length > SHOWN_INVALID ? (
                  <p className="mt-1 text-xs">ve {preview.invalid.length - SHOWN_INVALID} satır daha</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">
            Her satıra bir numara yazabilir ya da Excel&apos;den kopyaladığınız sütunları yapıştırabilirsiniz. Geçersiz
            satırlar eklenmez, sonucu aşağıda görürsünüz.
          </p>
        )}
      </div>

      <SubmitButton pendingLabel="Ekleniyor…" disabled={preview.valid.length === 0}>
        {preview.valid.length > 0 ? `${preview.valid.length} öğrenciyi ekle` : "Öğrenci ekle"}
      </SubmitButton>
    </form>
  );
}

type RosterResult = { added: number; updated: number; existing: number; invalid: string[] };

function RosterSummary({ result, onClose, onAnother }: { result: RosterResult; onClose: () => void; onAnother: () => void }) {
  const items = [
    { icon: Check, count: result.added, label: "eklendi", tone: "text-status-submitted" },
    { icon: RefreshCw, count: result.updated, label: "adı güncellendi", tone: "text-status-graded" },
    { icon: Equal, count: result.existing, label: "zaten vardı", tone: "text-muted-foreground" },
    { icon: X, count: result.invalid.length, label: "geçersiz", tone: "text-destructive" },
  ];
  return (
    <div className="space-y-4" role="status">
      <ul className="grid grid-cols-2 gap-2">
        {items.map(({ icon: Icon, count, label, tone }) => (
          <li
            key={label}
            className={cn("flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm", count === 0 && "opacity-60")}
          >
            <Icon className={cn("size-4 shrink-0", tone)} aria-hidden="true" />
            <span>
              <strong className="font-semibold">{count}</strong> {label}
            </span>
          </li>
        ))}
      </ul>
      {result.invalid.length > 0 ? (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
          <p className="mb-1 text-xs font-medium">Eklenmeyen satırlar</p>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto font-mono text-xs break-all">
            {result.invalid.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11" onClick={onAnother}>
          Başka liste ekle
        </Button>
        <Button type="button" className="h-11" onClick={onClose}>
          Tamam
        </Button>
      </div>
    </div>
  );
}
