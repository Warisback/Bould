import { memo } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";
import RatingBadge from "./RatingBadge";

/** The "Better:" tip, shared by the coach panel and the expanded move row. */
export function BetterTip({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border-l-2 border-great bg-great/10 px-3 py-2.5 text-sm leading-relaxed">
      <span className="font-semibold text-great">Better: </span>
      <span className="text-ink/90">{text}</span>
    </div>
  );
}

/**
 * Coaching for the move on the stage, straight under the replay controls, so a
 * dot tap or prev/next shows its explanation without scrolling (chess.com's
 * Game Review panel).
 */
function CoachPanel({ move, index, total }: { move: Move | null; index: number; total: number }) {
  if (!move) {
    return (
      <section className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-3.5 text-sm leading-snug text-muted">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-brand">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20V10M6 14l6-6 6 6M6 4h12" />
          </svg>
        </span>
        <span>
          Press play, or tap a dot on the timeline, to see how each of the {total} moves was rated and why.
        </span>
      </section>
    );
  }

  const meta = RATING_META[move.rating];
  return (
    <section key={index} className="animate-fade-up rounded-3xl bg-surface p-4" aria-label="Coach">
      <div className="flex items-start gap-3">
        <RatingBadge rating={move.rating} size="md" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${meta.text}`}>
            {meta.label} · Move {index + 1} of {total}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">{move.move}</p>
        </div>
      </div>
      {move.why && <p className="mt-2.5 text-sm leading-relaxed text-ink/80">{move.why}</p>}
      {move.better && <BetterTip text={move.better} />}
    </section>
  );
}

export default memo(CoachPanel);
