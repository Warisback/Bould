import { memo } from "react";
import type { Crux } from "@/lib/types";
import { formatTime } from "./format";

function CruxCard({ crux, onWatch }: { crux: Crux; onWatch: () => void }) {
  return (
    <section className="rounded-3xl border border-blunder/25 bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">What to try next time</h2>
        <span className="rounded-full bg-blunder/15 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-blunder">
          Crux {formatTime(crux.t)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blunder">What went wrong</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink/85">{crux.what_went_wrong}</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-good">Try this</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{crux.try_this}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onWatch}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
        </svg>
        Watch the crux
      </button>
    </section>
  );
}

export default memo(CruxCard);
