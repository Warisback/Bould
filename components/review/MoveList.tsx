"use client";

import { memo, useEffect, useRef } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";
import { clampPercent, formatTime } from "./format";
import RatingBadge from "./RatingBadge";

function MoveList({
  moves,
  currentIndex,
  expanded,
  playing,
  onRowTap,
}: {
  moves: readonly Move[];
  currentIndex: number;
  expanded: number | null;
  playing: boolean;
  onRowTap: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const prev = useRef({ index: currentIndex, playing });

  // Follow playback, but only as it advances naturally (not after a seek, which
  // may have its own scroll in flight) and only when the list is already on
  // screen, so the page never yanks you away from the video.
  useEffect(() => {
    const was = prev.current;
    prev.current = { index: currentIndex, playing };
    if (!playing || !was.playing || currentIndex !== was.index + 1) return;
    const list = listRef.current;
    const row = list?.children[currentIndex] as HTMLElement | undefined;
    if (!list || !row) return;
    const rect = list.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
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
              className={`relative scroll-mb-28 scroll-mt-4 transition-colors duration-300 ${current ? "bg-surface-2" : ""}`}
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
                  <span className="text-[11px] font-semibold text-faint">{i + 1}</span>
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
                  {m.better && (
                    <div className="mt-3 rounded-xl border-l-2 border-great bg-great/10 px-3 py-2.5 text-sm leading-relaxed">
                      <span className="font-semibold text-great">Better: </span>
                      <span className="text-ink/90">{m.better}</span>
                    </div>
                  )}
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
