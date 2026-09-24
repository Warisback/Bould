"use client";

import { memo, useCallback, useRef } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";
import { formatTime } from "./format";

/** how far a tap may land from a dot and still pick it */
const SNAP_PX = 22;
/** movement that turns a tap into a scrub */
const DRAG_PX = 6;

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
          // Touch goes to the track, which snaps a tap to the nearest dot (dots can
          // sit closer together than a finger). The buttons stay for keyboard use.
          <button
            key={i}
            type="button"
            data-dot
            onClick={() => onSelect(i)}
            aria-label={`Move ${i + 1} at ${formatTime(m.t)}: ${meta.label}`}
            className="pointer-events-none absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
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
  /** the gesture in progress: where it started, and whether it has become a drag */
  const gesture = useRef<{ x: number; dragging: boolean } | null>(null);
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

  /** Index of the move dot nearest to clientX, if one is within a fingertip. */
  const dotNear = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || duration <= 0) return -1;
      const rect = el.getBoundingClientRect();
      let best = -1;
      let bestDist = SNAP_PX;
      moves.forEach((m, i) => {
        const x = rect.left + (Math.min(m.t, duration) / duration) * rect.width;
        const d = Math.abs(x - clientX);
        if (d <= bestDist) {
          best = i;
          bestDist = d;
        }
      });
      return best;
    },
    [moves, duration],
  );

  const endGesture = () => {
    gesture.current = null;
  };

  return (
    <div
      className="relative h-11 touch-none select-none px-3"
      onPointerDown={(e) => {
        gesture.current = { x: e.clientX, dragging: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g) return;
        if (!g.dragging && Math.abs(e.clientX - g.x) < DRAG_PX) return;
        g.dragging = true;
        onSeek(timeFromPointer(e.clientX));
      }}
      onPointerUp={(e) => {
        const g = gesture.current;
        endGesture();
        if (!g || g.dragging) return;
        // A tap: land on the nearest move if there is one close by, else scrub there.
        const i = dotNear(e.clientX);
        if (i >= 0) onSelect(i);
        else onSeek(timeFromPointer(e.clientX));
      }}
      onPointerCancel={endGesture}
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
