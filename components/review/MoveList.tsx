"use client";

import { memo, useEffect, useRef } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";
import { BetterTip } from "./CoachPanel";
import { clampPercent, formatTime } from "./format";
import RatingBadge from "./RatingBadge";
import { isFullyVisible, visibleArea } from "./viewport";

function MoveList({
  moves,
  currentIndex,
  expanded,
  playing,
  onRowTap,
  onWatch,
}: {
  moves: readonly Move[];
  currentIndex: number;
  expanded: number | null;
  playing: boolean;
  onRowTap: (index: number) => void;
  /** replay the stage from just before this move */
  onWatch: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const prev = useRef({ index: currentIndex, playing });

  // Follow playback, but only as it advances naturally (not after a seek, which
  // may have its own scroll in flight) and only while the climber is reading
  // the list: the row that was current must be fully in view above the nav.
  // Otherwise the page would yank them away from the stage.
  useEffect(() => {
    const was = prev.current;
    prev.current = { index: currentIndex, playing };
    if (!playing || !was.playing || currentIndex !== was.index + 1) return;
    const rows = listRef.current?.children;
    const before = rows?.[was.index] as HTMLElement | undefined;
    const row = rows?.[currentIndex] as HTMLElement | undefined;
    if (!before || !row || !isFullyVisible(before)) return;
    const r = row.getBoundingClientRect();
    const { top, bottom } = visibleArea();
    if (r.top >= top && r.bottom <= bottom) return;
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex, playing]);

  return (
    <section className="overflow-hidden rounded-3xl bg-surface">
      <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
        <h2 className="text-lg font-bold">Moves</h2>
        <span className="text-sm text-muted">{moves.length} rated</span>
      </div>
      <ol ref={listRef} className="pb-2">
        {moves.map((m, i) => {
          const meta = RATING_META[m.rating];
          const current = i === currentIndex;
          const open = i === expanded;
          return (
            <li
              key={i}
              className={`relative scroll-mt-[calc(env(safe-area-inset-top)_+_1rem)] scroll-mb-[calc(7.5rem_+_env(safe-area-inset-bottom))] transition-colors duration-300 ${current ? "bg-surface-2" : ""}`}
            >
              <span
                className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-opacity duration-300 ${meta.bg} ${
                  current ? "opacity-100" : "opacity-0"
                }`}
              />
              <button
                type="button"
                onClick={() => onRowTap(i)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
              >
                <span className="flex w-8 shrink-0 flex-col items-start leading-tight tabular-nums">
                  <span className="text-[11px] font-semibold text-muted">{i + 1}</span>
                  <span className="font-mono text-xs text-muted">{formatTime(m.t)}</span>
                </span>
                <RatingBadge rating={m.rating} />
                <span className={`min-w-0 flex-1 text-[15px] leading-snug ${current ? "text-ink" : "text-ink/85"}`}>
                  {m.move}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {open && (
                <div className="animate-fade-up px-4 pb-4 pl-[5.25rem]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${meta.text}`}>{meta.label} move</span>
                    <span className="tabular-nums text-muted">
                      Send chance <span className="font-semibold text-ink">{clampPercent(m.send_chance)}%</span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{m.why}</p>
                  {m.better && <BetterTip text={m.better} />}
                  <button
                    type="button"
                    onClick={() => onWatch(i)}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-brand text-sm font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                    </svg>
                    Watch this move
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default memo(MoveList);
