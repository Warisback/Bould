import { fallbackMessage } from "./fitSample";

export function ReviewedBanner({ frames }: { frames: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-good/15 text-good">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <p className="text-sm leading-snug text-muted">
        <span className="font-semibold text-ink">Your climb, reviewed</span> from {frames} moments in your video. Tap a
        dot to jump to any move.
      </p>
    </div>
  );
}

export function FallbackBanner({
  reason,
  onRetry,
  retrying = false,
}: {
  reason?: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const canRetry = reason !== "no_key";
  return (
    <div className="rounded-2xl border border-inaccuracy/30 bg-inaccuracy/10 p-4">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-inaccuracy" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 2.5 20h19L12 3Z" />
          <path d="M12 10v4.5M12 17.5h.01" />
        </svg>
        <div className="min-w-0">
          <p className="font-semibold text-inaccuracy">Sample review, not your climb</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            {fallbackMessage(reason)} The moves below are from a sample climb, laid over your video so you can see how a
            review works.
          </p>
        </div>
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          Try my climb again
        </button>
      )}
    </div>
  );
}
