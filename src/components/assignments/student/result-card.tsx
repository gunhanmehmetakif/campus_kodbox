import { Star } from "lucide-react";

type ResultCardProps = {
  result: { score: number | null; maxScore: number | null; feedback: string | null };
};

const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

/** Published score and feedback. Feedback is plain text with preserved line breaks. */
export function ResultCard({ result }: ResultCardProps) {
  const { score, maxScore, feedback } = result;
  return (
    <section aria-label="Sonuç" className="space-y-3 rounded-xl border border-status-graded/30 bg-status-graded-bg p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-status-graded">
          <Star className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-status-graded">Puanınız yayınlandı</p>
          {score !== null ? (
            <p className="font-heading text-3xl font-semibold text-foreground">
              {numberFormat.format(score)}
              {maxScore !== null ? (
                <span className="text-xl text-muted-foreground"> / {numberFormat.format(maxScore)}</span>
              ) : null}
            </p>
          ) : (
            <p className="font-heading text-lg font-semibold text-foreground">Değerlendirme yayınlandı</p>
          )}
        </div>
      </div>
      {feedback ? (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-foreground">Geri bildirim</h2>
          <p className="text-sm break-words whitespace-pre-line text-foreground">{feedback}</p>
        </div>
      ) : null}
    </section>
  );
}
