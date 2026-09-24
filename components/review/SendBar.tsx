import { memo } from "react";

/**
 * chess.com eval bar, but for your chance of sending from this point.
 * Fills from the bottom; height eases between moves.
 */
function SendBar({ chance }: { chance: number }) {
  const low = chance < 12;
  return (
    <div
      role="meter"
      aria-label="Send chance"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={chance}
      aria-valuetext={`${chance}%`}
      className="relative w-6 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line"
    >
      <div
        className="absolute inset-x-0 bottom-0 rounded-full bg-ink transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height: `${chance}%` }}
      />
      <span
        className={`absolute inset-x-0 text-center font-mono text-[11px] font-bold leading-none tabular-nums transition-colors ${
          low ? "top-2 text-ink" : "bottom-2 text-bg"
        }`}
      >
        {chance}
      </span>
    </div>
  );
}

export default memo(SendBar);
