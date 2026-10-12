"use client";

import { AlertTriangle, CheckCircle2, ClipboardPaste, ExternalLink, Lock, Pencil, Send } from "lucide-react";
import { useActionState, useId, useRef, useState, useSyncExternalStore } from "react";

import { formatShortDateTime } from "@/components/assignments/shared/assignment-rules";
import {
  FieldError,
  FormError,
  SubmitButton,
  fieldMessages,
  formError,
  useFocusOnError,
  type FormState,
} from "@/components/auth/form-parts";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkSubmissionLinkAction, submitAssignmentAction } from "@/server/assignments/actions";

type LinkAccess = "public" | "private" | "unknown";
type SavedSubmission = { url: string; submittedAt: Date; isLate: boolean };

export type SubmissionCardProps = {
  assignmentId: string;
  /** Server computed submission window state. */
  windowState: "open" | "late" | "closed";
  allowAnyLink: boolean;
  latePenalty: { type: "none" | "points" | "percent"; value: number | null };
  /** Score already published: the submission can no longer change. */
  locked: boolean;
  submission: SavedSubmission | null;
  /** Open straight in the edit form when a submission already exists. */
  startEditing?: boolean;
  /** Called after a successful submit (the dialog closes and refreshes the page). */
  onSubmitted?: () => void;
};

const GUIDE_STEPS = [
  "Dosyanı Google Drive'a yükle.",
  'Paylaş → "Bağlantıya sahip olan herkes" → Görüntüleyen.',
  'Bağlantıyı kopyala, buraya yapıştır. "Panodan yapıştır" butonunu da kullanabilirsin.',
  "Teslimden sonra dosyayı değiştirme, teslim zamanı kaydedilir.",
];

function penaltyLabel(p: SubmissionCardProps["latePenalty"]): string {
  if (p.type === "none" || p.value === null) return "";
  const v = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(p.value);
  return p.type === "percent" ? `, −%${v} ceza uygulanabilir` : `, −${v} puan ceza uygulanabilir`;
}

function subscribeNothing() {
  return () => {};
}

function useCanReadClipboard(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function",
    () => false,
  );
}

function SubmissionGuide({ defaultOpen }: { defaultOpen: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border bg-muted/40">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Nasıl teslim edilir?
        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ol className="space-y-2 px-3 pb-3 text-sm">
        {GUIDE_STEPS.map((step, i) => (
          <li key={step} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function SubmittedLine({ submission }: { submission: SavedSubmission }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={submission.isLate ? "late" : "submitted"}
          label={submission.isLate ? "Geç teslim edildi" : "Teslim edildi"}
        />
        <span className="text-sm text-muted-foreground">{formatShortDateTime(submission.submittedAt)}</span>
      </div>
      <a
        href={submission.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-all">{submission.url}</span>
      </a>
    </div>
  );
}

export function SubmissionCard({
  assignmentId,
  windowState,
  allowAnyLink,
  latePenalty,
  locked,
  submission,
  startEditing = false,
  onSubmitted,
}: SubmissionCardProps) {
  const [saved, setSaved] = useState<SavedSubmission | null>(null);
  const [editing, setEditing] = useState(startEditing);
  const current = saved ?? submission;

  if (windowState === "closed" || locked) {
    return (
      <section aria-label="Teslim" className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
          Teslim kapalı
        </h2>
        <p className="text-sm text-muted-foreground">
          {locked ? "Puanınız yayınlandı, teslim artık değiştirilemez." : "Teslim süresi doldu."}
        </p>
        {current ? (
          <SubmittedLine submission={current} />
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-sm font-medium">Teslim etmediniz</p>
        )}
      </section>
    );
  }

  const showForm = !current || editing;

  return (
    <section aria-label="Teslim" className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Teslim</h2>

      {windowState === "late" ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2.5 text-sm text-status-pending"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Süre doldu. Geç teslim olarak kaydedilecek{penaltyLabel(latePenalty)}.</p>
        </div>
      ) : null}

      <SubmissionGuide defaultOpen={!current} />

      {showForm ? (
        <SubmitForm
          assignmentId={assignmentId}
          allowAnyLink={allowAnyLink}
          initialUrl={current?.url ?? ""}
          hasSubmission={current !== null}
          onSaved={(value) => {
            setSaved(value);
            setEditing(false);
            onSubmitted?.();
          }}
          onCancel={current ? () => setEditing(false) : undefined}
        />
      ) : current ? (
        <div className="space-y-3">
          <SubmittedLine submission={current} />
          <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Değiştir
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function SubmitForm({
  assignmentId,
  allowAnyLink,
  initialUrl,
  hasSubmission,
  onSaved,
  onCancel,
}: {
  assignmentId: string;
  allowAnyLink: boolean;
  initialUrl: string;
  hasSubmission: boolean;
  onSaved: (value: SavedSubmission) => void;
  onCancel?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const canPaste = useCanReadClipboard();

  const [url, setUrl] = useState(initialUrl);
  const [access, setAccess] = useState<LinkAccess | null>(null);
  const [checking, setChecking] = useState(false);
  const [pasteFailed, setPasteFailed] = useState(false);
  const lastChecked = useRef<string | null>(null);
  const checkSeq = useRef(0);

  const [state, formAction] = useActionState<FormState<{ submittedAt: Date; isLate: boolean }>, FormData>(
    async (prev, formData) => {
      const result = await submitAssignmentAction(prev, formData);
      if (result.ok) {
        onSaved({
          url: String(formData.get("url") ?? "").trim(),
          submittedAt: new Date(result.data.submittedAt),
          isLate: result.data.isLate,
        });
      }
      return result;
    },
    null,
  );
  useFocusOnError(formRef, state);

  async function runCheck(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastChecked.current) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    lastChecked.current = trimmed;
    const seq = ++checkSeq.current;
    setChecking(true);
    setAccess(null);
    try {
      const fd = new FormData();
      fd.set("assignmentId", assignmentId);
      fd.set("url", trimmed);
      const result = await checkSubmissionLinkAction(null, fd);
      if (seq === checkSeq.current) setAccess(result.ok ? result.data.access : null);
    } catch {
      if (seq === checkSeq.current) setAccess(null);
    } finally {
      if (seq === checkSeq.current) setChecking(false);
    }
  }

  function onChange(value: string) {
    setUrl(value);
    if (value.trim() !== lastChecked.current) {
      checkSeq.current++;
      setAccess(null);
      setChecking(false);
    }
  }

  async function pasteFromClipboard() {
    setPasteFailed(false);
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setPasteFailed(true);
        return;
      }
      onChange(text);
      void runCheck(text);
    } catch {
      setPasteFailed(true);
    }
  }

  const urlErrors = fieldMessages(state, "url");
  const message = formError(state);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <FormError message={urlErrors ? undefined : message} />

      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {allowAnyLink ? "Teslim bağlantısı" : "Google Drive bağlantısı"}
        </label>
        <Input
          id={inputId}
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://drive.google.com/…"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => void runCheck(e.target.value)}
          aria-invalid={urlErrors ? true : undefined}
          aria-describedby={`${hintId}${urlErrors ? ` ${errorId}` : ""}`}
          className="h-12 px-3 text-base"
          required
        />
        <FieldError id={errorId} messages={urlErrors} />

        {canPaste ? (
          <Button type="button" variant="outline" className="h-11 w-full" onClick={() => void pasteFromClipboard()}>
            <ClipboardPaste aria-hidden="true" />
            Panodan yapıştır
          </Button>
        ) : null}

        <div id={hintId} aria-live="polite" className="text-sm">
          {pasteFailed ? (
            <p className="text-muted-foreground">Panoya erişilemedi. Bağlantıyı kutuya elle yapıştırın.</p>
          ) : null}
          {checking ? <p className="text-muted-foreground">Bağlantı kontrol ediliyor…</p> : null}
          {!checking && access === "public" ? (
            <p className="flex items-start gap-2 text-status-submitted">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Bağlantı herkese açık
            </p>
          ) : null}
          {!checking && access === "private" ? (
            <p className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2.5 text-status-pending">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Bu link herkese açık değil, eğitmen dosyayı açamaz. Paylaş → Genel erişim → Bağlantıya sahip olan
                herkes.
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton className="h-12 sm:flex-1" pendingLabel="Teslim ediliyor…">
          <Send aria-hidden="true" />
          {hasSubmission ? "Teslimi güncelle" : "Teslim et"}
        </SubmitButton>
        {onCancel ? (
          <Button type="button" variant="ghost" className="h-11 sm:h-12" onClick={onCancel}>
            Vazgeç
          </Button>
        ) : null}
      </div>
    </form>
  );
}
