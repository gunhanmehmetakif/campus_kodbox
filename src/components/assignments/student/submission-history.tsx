import { ExternalLink } from "lucide-react";

import { formatShortDateTime } from "@/components/assignments/shared/assignment-rules";

type SubmissionHistoryProps = {
  history: Array<{ url: string; submittedAt: Date; isLate: boolean }>;
};

/** Collapsible list of earlier submissions, newest first. Hidden when there is nothing to show. */
export function SubmissionHistory({ history }: SubmissionHistoryProps) {
  if (history.length === 0) return null;
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Teslim geçmişi ({history.length})
        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul className="divide-y border-t">
        {history.map((h, i) => (
          <li key={`${h.submittedAt.toISOString()}-${i}`} className="space-y-1 px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {formatShortDateTime(h.submittedAt)}
              {h.isLate ? " · Geç teslim" : ""}
            </p>
            <a
              href={h.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex min-h-11 items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-all">{h.url}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
