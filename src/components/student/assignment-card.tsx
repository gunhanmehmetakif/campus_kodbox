import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink } from "lucide-react";

import { AssignmentRulesLine, penaltyText } from "@/components/assignments/shared/assignment-rules";
import { ResultCard } from "@/components/assignments/student/result-card";
import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentAssignmentView } from "@/server/assignments/queries";
import { CollapsibleBody } from "./collapsible-body";
import { SubmissionDialog } from "./submission-dialog";
import { formatDueShort, formatLongDate, formatShortDateTime } from "./utils";

/** A feed card, or the bare view of a deep-linked assignment (no publish date). */
export type AssignmentCardData = StudentAssignmentView & { publishedAt?: Date | null };

const scoreFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

function StateBadge({ a }: { a: AssignmentCardData }) {
  const sub = a.submission;
  if (sub?.result) {
    const { score, maxScore } = sub.result;
    const label =
      score === null
        ? "Puanlandı"
        : maxScore === null
          ? `Puan ${scoreFormat.format(score)}`
          : `Puan ${scoreFormat.format(score)} / ${scoreFormat.format(maxScore)}`;
    return <StatusBadge status="graded" label={label} />;
  }
  if (sub) {
    return <StatusBadge status={sub.isLate ? "late" : "submitted"} label={sub.isLate ? "Geç teslim edildi" : "Teslim edildi"} />;
  }
  switch (a.window.state) {
    case "open":
      return <StatusBadge status="pending" label="Bekliyor" />;
    case "late":
      return <StatusBadge status="late" label="Geç teslim" />;
    case "closed":
      return <StatusBadge status="late" label="Süre doldu" />;
    case "no_submission":
      return <Badge variant="secondary">Teslim gerekmiyor</Badge>;
  }
}

function FileLink({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </a>
  );
}

function Footer({ a, autoOpen }: { a: AssignmentCardData; autoOpen: boolean }) {
  const sub = a.submission;
  const state = a.window.state;
  const canSubmit = state === "open" || state === "late";

  if (sub?.result) {
    return (
      <div className="space-y-1">
        <ResultCard result={sub.result} />
        <FileLink url={sub.url}>Teslim linkini aç</FileLink>
      </div>
    );
  }

  const dialog = (label: string, variant: "default" | "outline") =>
    canSubmit ? (
      <SubmissionDialog
        assignmentId={a.id}
        title={a.title}
        dueAt={a.dueAt}
        windowState={state === "late" ? "late" : "open"}
        allowAnyLink={a.allowAnyLink}
        latePenalty={{ type: a.latePenaltyType, value: a.latePenaltyValue }}
        submission={sub}
        triggerLabel={label}
        triggerVariant={variant}
        defaultOpen={autoOpen}
      />
    ) : null;

  if (sub) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-status-submitted">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Teslim edildi
          </span>
          <span className="text-muted-foreground">· {formatShortDateTime(sub.submittedAt)} ·</span>
          <FileLink url={sub.url}>Linki aç</FileLink>
        </p>
        {dialog("Güncelle", "outline")}
      </div>
    );
  }

  if (state === "open") return dialog("Teslim et", "default");

  if (state === "late") {
    const penalty = penaltyText(a);
    return (
      <div className="space-y-3">
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2.5 text-sm text-status-pending"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Süre doldu, geç teslim olarak kaydedilecek{penalty ? ` (${penalty})` : ""}.</span>
        </p>
        {dialog("Geç teslim et", "default")}
      </div>
    );
  }

  if (state === "closed") {
    return <p className="rounded-lg bg-muted px-3 py-2.5 text-sm font-medium">Süre doldu, teslim edilmedi.</p>;
  }
  return null;
}

/** Full assignment card used by the course feed, "Ödevlerim" and the deep link. */
export function AssignmentCard({
  a,
  showCourse = false,
  highlight = false,
  autoOpen = false,
}: {
  a: AssignmentCardData;
  showCourse?: boolean;
  highlight?: boolean;
  autoOpen?: boolean;
}) {
  const submitted = a.submission !== null;
  return (
    <article
      id={`odev-${a.id}`}
      className={cn(
        "scroll-mt-20 space-y-3 rounded-xl border bg-card p-4 text-card-foreground",
        highlight && "ring-2 ring-primary",
      )}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <ClipboardList aria-hidden="true" />
            Ödev
          </Badge>
          {showCourse ? (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
              {a.course.code}
            </span>
          ) : null}
          {a.publishedAt ? (
            <time dateTime={a.publishedAt.toISOString()} className="text-xs text-muted-foreground">
              {formatLongDate(a.publishedAt)}
            </time>
          ) : null}
          <span className="ml-auto">
            <StateBadge a={a} />
          </span>
        </div>
        <h3 className="font-heading text-lg leading-snug font-medium break-words">{a.title}</h3>
      </header>

      {a.submissionType === "link" ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
          <span>Son teslim:</span>
          {a.dueAt ? (
            <>
              <time dateTime={a.dueAt.toISOString()}>{formatDueShort(a.dueAt)}</time>
              {submitted ? null : (
                <>
                  <span className="text-muted-foreground">·</span>
                  <DeadlineCountdown dueAt={a.dueAt} relativeOnly />
                </>
              )}
            </>
          ) : (
            <span>Süresiz</span>
          )}
        </p>
      ) : a.dueAt ? (
        <p className="text-sm font-medium">
          Tarih: <time dateTime={a.dueAt.toISOString()}>{formatDueShort(a.dueAt)}</time>
        </p>
      ) : null}

      <AssignmentRulesLine a={a} />

      {a.bodyMd.trim() ? (
        <CollapsibleBody>
          <Markdown>{a.bodyMd}</Markdown>
        </CollapsibleBody>
      ) : null}
      {a.links.length > 0 ? (
        <ul className="space-y-1 border-t pt-3">
          {a.links.map((l, i) => (
            <li key={`${i}-${l.url}`}>
              <FileLink url={l.url}>
                <span className="min-w-0 truncate">{l.title || l.url}</span>
              </FileLink>
            </li>
          ))}
        </ul>
      ) : null}

      <Footer a={a} autoOpen={autoOpen} />
    </article>
  );
}
