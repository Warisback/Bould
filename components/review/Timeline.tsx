"use client";

import { memo, useCallback, useRef } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";
import { formatTime } from "./format";

const Dots = memo(function Dots({
  moves,
  duration,
  currentIndex,
  onSelect,
}: {
  moves: readonly Move[];
  duration: number;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      {moves.map((m, i) => {
        const meta = RATING_META[m.rating];
        const active = i === currentIndex;
        return (
          <button
            key={i}
            type="button"
            data-dot
            onClick={() => onSelect(i)}
            aria-label={`Move ${i + 1} at ${formatTime(m.t)}: ${meta.label}`}
            className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${(Math.min(m.t, duration) / duration) * 100}%`, zIndex: active ? 2 : 1 }}
          >
            <span
              className={`block rounded-full ring-2 ring-bg transition-transform duration-200 ${meta.bg} ${
                active ? "h-3.5 w-3.5 scale-110" : "h-2.5 w-2.5"
              }`}
            />
          </button>
        );
      })}
    </>
  );
});

/** Coloured move dots on a scrubbable track, chess.com Game Review style. */
export default function Timeline({
  moves,
  duration,
  currentTime,
  currentIndex,
  onSeek,
  onSelect,
}: {
  moves: readonly Move[];
  duration: number;
  currentTime: number;
  currentIndex: number;
  onSeek: (t: number) => void;
  onSelect: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return (Math.min(Math.max(0, clientX - rect.left), rect.width) / rect.width) * duration;
    },
    [duration],
  );

  return (
    <div
      className="relative h-8 touch-none select-none px-3"
      onPointerDown={(e) => {
        // Dots handle their own taps (seek + select).
        if ((e.target as HTMLElement).closest("[data-dot]")) return;
        scrubbing.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onSeek(timeFromPointer(e.clientX));
      }}
      onPointerMove={(e) => {
        if (scrubbing.current) onSeek(timeFromPointer(e.clientX));
      }}
      onPointerUp={() => {
        scrubbing.current = false;
      }}
      onPointerCancel={() => {
        scrubbing.current = false;
      }}
    >
      <div ref={trackRef} className="relative h-full">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-2" />
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted/60"
          style={{ width: `${progress * 100}%` }}
        />
        <Dots moves={moves} duration={duration} currentIndex={currentIndex} onSelect={onSelect} />
        <div
          className="pointer-events-none absolute top-1/2 z-0 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow-[0_0_0_2px_var(--color-bg)]"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
