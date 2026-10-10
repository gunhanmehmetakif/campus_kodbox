import type { Metadata } from "next";
import { Archive, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssignmentRules } from "@/components/assignments/shared/assignment-rules";
import { ResultCard } from "@/components/assignments/student/result-card";
import { SubmissionCard } from "@/components/assignments/student/submission-card";
import { SubmissionHistory } from "@/components/assignments/student/submission-history";
import { DeadlineCountdown } from "@/components/common/deadline-countdown";
import { Markdown } from "@/components/common/markdown";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getAssignmentForStudent } from "@/server/assignments/queries";

export const metadata: Metadata = { title: "Ödev" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StudentAssignmentPage({ params }: PageProps<"/ogrenci/odevler/[assignmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <AssignmentContent params={params} />
    </Suspense>
  );
}

async function AssignmentContent({ params }: { params: PageProps<"/ogrenci/odevler/[assignmentId]">["params"] }) {
  const { assignmentId } = await params;
  if (!UUID_RE.test(assignmentId)) notFound();

  const a = await getAssignmentForStudent(assignmentId);
  const submitted = a.submission !== null;
  const result = a.submission?.result ?? null;

  return (
    <div className="space-y-5">
      <Link
        href={`/ogrenci/dersler/${a.course.id}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← {a.course.code}
      </Link>

      {result ? <ResultCard result={result} /> : null}

      <PageHeader title={a.title} description={`${a.course.code} · ${a.course.name}`} />

      {a.course.archived ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-4 py-3 text-sm text-status-pending"
        >
          <Archive className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Bu ders arşivlenmiş. Ödev salt okunurdur.</p>
        </div>
      ) : null}

      {/* Mobile order: countdown, submission card, then the description. Desktop: card in a right column. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border bg-card px-4 py-3 lg:col-start-1">
          <span className="text-xs text-muted-foreground">Son teslim</span>
          <DeadlineCountdown dueAt={a.dueAt} submitted={submitted} className="text-xl font-semibold" />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {a.window.state === "no_submission" ? (
            <section aria-label="Teslim" className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-semibold">Bu ödev için teslim gerekmiyor</h2>
                <p className="text-sm text-muted-foreground">Açıklamayı okuyup eğitmeninizin yönergelerini izleyin.</p>
              </div>
            </section>
          ) : (
            <SubmissionCard
              assignmentId={a.id}
              windowState={a.window.state}
              allowAnyLink={a.allowAnyLink}
              latePenalty={{ type: a.latePenaltyType, value: a.latePenaltyValue }}
              locked={result !== null}
              submission={
                a.submission
                  ? { url: a.submission.url, submittedAt: a.submission.submittedAt, isLate: a.submission.isLate }
                  : null
              }
            />
          )}
          {a.submission ? <SubmissionHistory history={a.submission.history} /> : null}
        </div>

        <div className="min-w-0 space-y-5 lg:col-start-1">
          <AssignmentRules a={a} />
          {a.bodyMd.trim() ? <Markdown>{a.bodyMd}</Markdown> : null}
          {a.links.length > 0 ? (
            <section aria-label="Bağlantılar" className="space-y-2">
              <h2 className="font-heading text-lg font-semibold">Bağlantılar</h2>
              <ul className="space-y-1">
                {a.links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex min-h-11 items-center gap-2 text-primary underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{l.title || l.url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
