"use client";

import Link from "next/link";
import { formatAccuracy, formatTime } from "@/components/review/format";
import { ResultPill } from "@/components/review/SummaryCard";
import { RATING_META } from "@/lib/ratings";
import { useLastReview } from "@/lib/useLastReview";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 text-2xl font-bold tabular-nums leading-none">{children}</div>
    </div>
  );
}

/** Strava-style activity card for the review cached on this phone. */
export default function LastReviewCard() {
  const last = useLastReview();
  if (!last || !Array.isArray(last.review?.moves)) return null;

  const { review } = last;
  const moves = [...review.moves].sort((a, b) => a.t - b.t);
  const title = last.source === "sample" ? "Sample climb" : "Your climb";
  const when = new Date(last.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const lastT = moves.length ? moves[moves.length - 1].t : 0;
  const crux = !review.sent && review.crux ? review.crux : null;

  return (
    <Link
      href="/review/last"
      className="block animate-fade-up rounded-3xl bg-surface p-5 transition active:scale-[0.99] active:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Last review</p>
        <p className="text-xs text-faint">{when}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="text-xl font-bold">{title}</p>
        <ResultPill sent={review.sent} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Accuracy">
          {formatAccuracy(review.accuracy)}
          <span className="text-base text-muted">%</span>
        </Stat>
        <Stat label="Moves">{moves.length}</Stat>
        {crux ? <Stat label="Crux">{formatTime(crux.t)}</Stat> : <Stat label="Time">{formatTime(lastT)}</Stat>}
      </div>

      <div className="mt-5 flex h-1.5 gap-1" aria-hidden>
        {moves.map((m, i) => (
          <span key={i} className={`flex-1 rounded-full ${RATING_META[m.rating].bg}`} />
        ))}
      </div>

      <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-brand">
        Open review
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </p>
    </Link>
  );
}
