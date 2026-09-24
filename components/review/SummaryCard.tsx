import { memo } from "react";
import { RATING_META } from "@/lib/ratings";
import { RATINGS, type MoveRating, type Review } from "@/lib/types";
import { formatAccuracy } from "./format";
import RatingBadge from "./RatingBadge";

export function ResultPill({ sent, className = "" }: { sent: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        sent ? "bg-good/15 text-good" : "bg-blunder/15 text-blunder"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${sent ? "bg-good" : "bg-blunder"}`} />
      {sent ? "Sent" : "Fell"}
    </span>
  );
}

function SummaryCard({
  review,
  counts,
}: {
  review: Review;
  counts: Record<MoveRating, number>;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Accuracy</p>
          <p className="mt-1 flex items-baseline font-bold leading-none tabular-nums">
            <span className="text-[56px] tracking-tight">{formatAccuracy(review.accuracy)}</span>
            <span className="ml-1 text-2xl text-muted">%</span>
          </p>
        </div>
        <ResultPill sent={review.sent} className="mt-1" />
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{review.summary}</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {RATINGS.map((r) => {
          const n = counts[r];
          return (
            <div
              key={r}
              className={`flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2.5 ${n === 0 ? "opacity-45" : ""}`}
            >
              <RatingBadge rating={r} size="sm" />
              <span className="flex-1 text-sm text-muted">{RATING_META[r].label}</span>
              <span className={`text-lg font-bold tabular-nums ${n > 0 ? RATING_META[r].text : "text-faint"}`}>{n}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default memo(SummaryCard);
