import { ExternalLink } from "lucide-react";

import { AssignmentRules } from "@/components/assignments/shared/assignment-rules";
import { Markdown } from "@/components/common/markdown";
import type { getAssignmentForInstructor } from "@/server/assignments/queries";

type Detail = Awaited<ReturnType<typeof getAssignmentForInstructor>>;

/** What students see (rules, description, links). */
export function AssignmentDetail({ assignment }: { assignment: Detail }) {
  return (
    <div className="max-w-3xl space-y-5">
      <section aria-label="Kurallar" className="rounded-xl border bg-card p-4">
        <AssignmentRules
          a={{
            submissionType: assignment.submissionType,
            dueAt: assignment.dueAt,
            lateAllowed: assignment.lateAllowed,
            lateUntil: assignment.lateUntil,
            latePenaltyType: assignment.latePenaltyType,
            latePenaltyValue: assignment.latePenaltyValue,
            maxScore: assignment.maxScore,
            allowAnyLink: assignment.allowAnyLink,
          }}
        />
      </section>
      {assignment.bodyMd ? <Markdown>{assignment.bodyMd}</Markdown> : null}
      {assignment.links.length > 0 ? (
        <ul className="space-y-1 border-t pt-3">
          {assignment.links.map((link, i) => (
            <li key={`${i}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{link.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
