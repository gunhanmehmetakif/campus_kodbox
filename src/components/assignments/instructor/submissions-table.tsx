"use client";

import { Check, ExternalLink, History, Loader2, MessageSquare, MessageSquareText } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge, type SubmissionStatus } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { gradeSubmissionAction } from "@/server/assignments/actions";
import type { listSubmissions } from "@/server/assignments/queries";
import { suggestScore } from "@/server/assignments/rules";
import { formatScore, formatShort, parseScore } from "./format";

type Row = Awaited<ReturnType<typeof listSubmissions>>["items"][number];
type HistoryEntry = { url: string; submittedAt: Date; isLate: boolean };
type Penalty = { type: "none" | "points" | "percent"; value: number | null };
type Grade = { score: number | null; feedback: string | null };
type Progress = "saving" | "saved";

export const FEEDBACK_MAX = 2000;

type SubmissionsTableProps = {
  rows: Row[];
  /** Submission id -> previous submissions, only for rows with more than one submission. */
  histories: Record<string, HistoryEntry[]>;
  maxScore: number | null;
  penalty: Penalty;
  /** False for archived courses (read only). */
  editable: boolean;
};

export function SubmissionsTable({ rows, histories, maxScore, penalty, editable }: SubmissionsTableProps) {
  const canGrade = editable && maxScore !== null;
  const tableRef = useRef<HTMLTableElement>(null);
  const [overrides, setOverrides] = useState<Record<string, Grade>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  // Unsaved text typed into score inputs, keyed by submission id.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [seenRows, setSeenRows] = useState(rows);
  const [feedbackFor, setFeedbackFor] = useState<Row | null>(null);
  const [historyFor, setHistoryFor] = useState<Row | null>(null);

  // Fresh server data (after revalidation) replaces optimistic values.
  if (seenRows !== rows) {
    setSeenRows(rows);
    setOverrides({});
  }

  function gradeOf(row: Row): Grade {
    return overrides[row.submission?.id ?? ""] ?? { score: row.submission?.score ?? null, feedback: row.submission?.feedback ?? null };
  }

  async function grade(row: Row, next: Grade): Promise<boolean> {
    const id = row.submission?.id;
    if (!id) return false;
    const previous = gradeOf(row);
    setOverrides((o) => ({ ...o, [id]: next }));
    setProgress((p) => ({ ...p, [id]: "saving" }));
    const formData = new FormData();
    formData.set("submissionId", id);
    formData.set("score", formatScore(next.score));
    formData.set("feedback", next.feedback ?? "");
    let result;
    try {
      result = await gradeSubmissionAction(null, formData);
    } catch {
      result = { ok: false as const, error: "Bir şeyler ters gitti, tekrar deneyin." };
    }
    if (result.ok) {
      setProgress((p) => ({ ...p, [id]: "saved" }));
      return true;
    }
    setOverrides((o) => ({ ...o, [id]: previous }));
    setProgress((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    toast.error(result.fieldErrors?.score?.[0] ?? result.error);
    return false;
  }

  function setDraft(id: string, value: string | null) {
    setDrafts((d) => {
      if (value === null) {
        const next = { ...d };
        delete next[id];
        return next;
      }
      return { ...d, [id]: value };
    });
  }

  function focusNext(index: number): boolean {
    const next = tableRef.current?.querySelector<HTMLInputElement>(`input[data-score-index="${index + 1}"]`);
    next?.focus();
    return Boolean(next);
  }

  // Position of each gradable row among the score inputs (Enter moves to index + 1).
  const scoreIndexOf = new Map<string, number>();
  for (const row of rows) {
    if (canGrade && row.submission) scoreIndexOf.set(row.submission.id, scoreIndexOf.size);
  }

  return (
    <>
      <table ref={tableRef} className="w-full text-sm max-md:block">
        <thead className="max-md:hidden">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="w-24 px-2 py-2 font-medium">No</th>
            <th scope="col" className="px-2 py-2 font-medium">Ad</th>
            <th scope="col" className="px-2 py-2 font-medium">Durum</th>
            <th scope="col" className="px-2 py-2 font-medium">Teslim zamanı</th>
            <th scope="col" className="px-2 py-2 font-medium">Link</th>
            <th scope="col" className="w-28 px-2 py-2 font-medium">Puan{maxScore !== null ? ` / ${formatScore(maxScore)}` : ""}</th>
            <th scope="col" className="px-2 py-2 font-medium">Önerilen</th>
            <th scope="col" className="px-2 py-2 font-medium">Geri bildirim</th>
            <th scope="col" className="px-2 py-2 font-medium">Yayın</th>
          </tr>
        </thead>
        <tbody className="max-md:block max-md:space-y-3">
          {rows.map((row) => {
            const sub = row.submission;
            const current = gradeOf(row);
            const gradable = canGrade && sub !== null;
            const scoreIndex = sub ? (scoreIndexOf.get(sub.id) ?? -1) : -1;
            const published = sub?.scorePublishedAt != null;
            const status = rowStatus(row, current.score);
            return (
              <tr
                key={row.rosterId}
                className="border-b align-middle max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:rounded-xl max-md:border max-md:bg-card max-md:p-3"
              >
                <td className="px-2 py-2 font-mono text-xs max-md:col-span-1 max-md:p-0">{row.studentNo}</td>
                <td className="px-2 py-2 max-md:col-span-2 max-md:order-first max-md:p-0 max-md:text-base max-md:font-medium">
                  {row.displayName ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-2 max-md:col-span-1 max-md:p-0 max-md:text-right">
                  <StatusBadge status={status.status} label={status.label} />
                </td>
                <td className="px-2 py-2 whitespace-nowrap max-md:col-span-2 max-md:p-0">
                  {sub ? (
                    <span className={cn(sub.isLate && "text-status-late")}>
                      {formatShort(sub.submittedAt)}
                      {sub.isLate ? " · geç" : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {sub && sub.historyCount > 1 ? (
                    <button
                      type="button"
                      onClick={() => setHistoryFor(row)}
                      aria-label={`${sub.historyCount} teslim geçmişini göster`}
                      className="ml-2 inline-flex min-h-8 items-center gap-1 rounded-full bg-muted px-2 text-xs text-muted-foreground hover:bg-accent md:min-h-6"
                    >
                      <History className="size-3" aria-hidden="true" />
                      {sub.historyCount}
                    </button>
                  ) : null}
                </td>
                <td className="px-2 py-2 max-md:col-span-2 max-md:p-0">
                  {sub ? (
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={`${row.studentNo} teslim linkini yeni sekmede aç`}
                      className="inline-flex min-h-11 items-center gap-1.5 text-primary underline-offset-4 hover:underline md:min-h-8"
                    >
                      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                      <span className="md:sr-only">Teslimi aç</span>
                    </a>
                  ) : null}
                </td>
                <td className="px-2 py-2 max-md:col-span-1 max-md:p-0">
                  {sub ? (
                    gradable ? (
                      <ScoreCell
                        index={scoreIndex}
                        studentNo={row.studentNo}
                        shown={formatScore(current.score)}
                        draft={drafts[sub.id]}
                        onDraft={(value) => setDraft(sub.id, value)}
                        score={current.score}
                        maxScore={maxScore}
                        busy={progress[sub.id]}
                        onCommit={(score) => grade(row, { ...current, score })}
                        onNext={() => focusNext(scoreIndex)}
                      />
                    ) : (
                      <span className="tabular-nums">{current.score === null ? "—" : formatScore(current.score)}</span>
                    )
                  ) : null}
                </td>
                <td className="px-2 py-2 max-md:col-span-1 max-md:p-0">
                  {gradable && sub ? (
                    <Suggestion
                      draft={drafts[sub.id]}
                      isLate={sub.isLate}
                      penalty={penalty}
                      onApply={(value) => {
                        setDraft(sub.id, null);
                        void grade(row, { ...current, score: value });
                      }}
                    />
                  ) : null}
                </td>
                <td className="px-2 py-2 max-md:col-span-1 max-md:p-0">
                  {sub ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("size-11 md:size-8", current.feedback ? "text-primary" : "text-muted-foreground")}
                      aria-label={current.feedback ? `${row.studentNo} geri bildirimini düzenle` : `${row.studentNo} için geri bildirim yaz`}
                      onClick={() => setFeedbackFor(row)}
                    >
                      {current.feedback ? <MessageSquareText aria-hidden="true" /> : <MessageSquare aria-hidden="true" />}
                    </Button>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-xs text-muted-foreground max-md:col-span-1 max-md:p-0 max-md:self-center">
                  {sub && current.score !== null ? (published ? "Yayında" : "Yayınlanmadı") : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {feedbackFor?.submission ? (
        <FeedbackDialog
          key={feedbackFor.submission.id}
          row={feedbackFor}
          initial={gradeOf(feedbackFor).feedback ?? ""}
          editable={editable}
          onClose={() => setFeedbackFor(null)}
          onSave={(feedback) => grade(feedbackFor, { ...gradeOf(feedbackFor), feedback: feedback || null })}
        />
      ) : null}

      {historyFor?.submission ? (
        <Dialog open onOpenChange={(open) => !open && setHistoryFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teslim geçmişi</DialogTitle>
              <DialogDescription>
                {historyFor.studentNo}
                {historyFor.displayName ? ` · ${historyFor.displayName}` : ""}
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
              {(histories[historyFor.submission.id] ?? []).map((entry, i) => (
                <li key={`${i}-${entry.url}`} className="space-y-0.5 rounded-lg border p-2.5 text-sm">
                  <p className={cn("text-xs", entry.isLate ? "text-status-late" : "text-muted-foreground")}>
                    {formatShort(entry.submittedAt)}
                    {entry.isLate ? " · geç" : ""}
                  </p>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block break-all text-primary underline-offset-4 hover:underline"
                  >
                    {entry.url}
                  </a>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function rowStatus(row: Row, score: number | null): { status: SubmissionStatus; label?: string } {
  const sub = row.submission;
  if (!sub) return { status: "pending", label: row.registered ? "Teslim etmedi" : "Kayıt olmadı" };
  if (score !== null) return { status: "graded" };
  if (sub.isLate) return { status: "late", label: "Geç teslim" };
  return { status: "submitted" };
}

type ScoreCellProps = {
  index: number;
  studentNo: string;
  /** Saved score as text. */
  shown: string;
  /** Unsaved text, undefined while not editing. */
  draft: string | undefined;
  onDraft: (value: string | null) => void;
  score: number | null;
  maxScore: number | null;
  busy: Progress | undefined;
  onCommit: (score: number | null) => Promise<boolean>;
  /** Focuses the next row's input; false when there is none. */
  onNext: () => boolean;
};

/** Inline score input: Enter or blur saves (optimistic), Enter also jumps to the next row, Esc cancels. */
function ScoreCell({ index, studentNo, shown, draft, onDraft, score, maxScore, busy, onCommit, onNext }: ScoreCellProps) {
  const skipBlur = useRef(false);

  function commit() {
    if (draft === undefined) return;
    const parsed = parseScore(draft);
    onDraft(null);
    if (parsed === undefined || (parsed !== null && maxScore !== null && (parsed < 0 || parsed > maxScore))) {
      toast.error(
        parsed === undefined ? "Geçerli bir puan girin." : `Puan 0 ile ${formatScore(maxScore)} arasında olmalı.`,
      );
      return;
    }
    if (parsed !== score) void onCommit(parsed);
  }

  return (
    <div className="relative">
      <input
        data-score-index={index}
        value={draft ?? shown}
        onChange={(e) => onDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false;
            return;
          }
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            // The stale blur of this input must not save a second time.
            skipBlur.current = true;
            if (!onNext()) skipBlur.current = false;
          } else if (e.key === "Escape") {
            e.preventDefault();
            onDraft(null);
            skipBlur.current = true;
            e.currentTarget.blur();
          }
        }}
        inputMode="decimal"
        autoComplete="off"
        aria-label={`${studentNo} puanı`}
        placeholder="—"
        className="h-11 w-full min-w-20 rounded-lg border bg-background px-2.5 pr-7 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center" aria-live="polite">
        {busy === "saving" ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Kaydediliyor" />
        ) : busy === "saved" ? (
          <Check className="size-3.5 text-status-submitted" aria-label="Kaydedildi" />
        ) : null}
      </span>
    </div>
  );
}

/** Live late-penalty suggestion for the score being typed; one click saves the penalized value. */
function Suggestion({
  draft,
  isLate,
  penalty,
  onApply,
}: {
  draft: string | undefined;
  isLate: boolean;
  penalty: Penalty;
  onApply: (score: number) => void;
}) {
  if (!isLate || penalty.type === "none" || draft === undefined) return null;
  const raw = parseScore(draft);
  if (raw === null || raw === undefined) return null;
  const suggested = suggestScore(raw, penalty, true);
  if (suggested === raw) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 px-2.5 tabular-nums md:h-8"
      title="Ceza uygulanmış puanı kaydet"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onApply(suggested)}
    >
      {formatScore(suggested)}
      <span className="text-xs text-muted-foreground">uygula</span>
    </Button>
  );
}

function FeedbackDialog({
  row,
  initial,
  editable,
  onClose,
  onSave,
}: {
  row: Row;
  initial: string;
  editable: boolean;
  onClose: () => void;
  onSave: (feedback: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(initial);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const saved = await onSave(text.trim());
    setPending(false);
    if (saved) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geri bildirim</DialogTitle>
          <DialogDescription>
            {row.studentNo}
            {row.displayName ? ` · ${row.displayName}` : ""}. Puan yayınlandığında öğrenci görür.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={FEEDBACK_MAX}
          readOnly={!editable}
          aria-label="Geri bildirim metni"
          placeholder="Kısa bir not yazın"
          className="min-h-32"
          autoFocus
        />
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 sm:h-8" onClick={onClose} disabled={pending}>
            {editable ? "Vazgeç" : "Kapat"}
          </Button>
          {editable ? (
            <Button type="button" className="h-11 sm:h-8" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Kaydet
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
