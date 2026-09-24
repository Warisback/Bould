"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { RATING_META } from "@/lib/ratings";
import { RATINGS, type MoveRating, type Review } from "@/lib/types";
import CruxCard from "./CruxCard";
import { clampPercent, formatTime, moveIndexAt } from "./format";
import MoveList from "./MoveList";
import PageHeader from "./PageHeader";
import RatingBadge from "./RatingBadge";
import SendBar from "./SendBar";
import SummaryCard from "./SummaryCard";
import Timeline from "./Timeline";
import { usePlayback } from "./usePlayback";
import VirtualStage from "./VirtualStage";

export interface ReviewScreenProps {
  review: Review;
  videoUrl?: string | null;
  footer?: ReactNode;
  banner?: ReactNode;
}

/** Aspect used for the virtual stage, and for a video until its metadata loads. */
const DEFAULT_ASPECT = 3 / 4;

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export default function ReviewScreen({ review, videoUrl, footer, banner }: ReviewScreenProps) {
  const moves = useMemo(() => [...review.moves].sort((a, b) => a.t - b.t), [review.moves]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(RATINGS.map((r) => [r, 0])) as Record<MoveRating, number>;
    for (const m of moves) c[m.rating] += 1;
    return c;
  }, [moves]);

  const hasVideo = Boolean(videoUrl);
  // iOS Safari only paints a first frame when asked for a time offset.
  const src = videoUrl && !videoUrl.includes("#") ? `${videoUrl}#t=0.001` : videoUrl ?? undefined;
  const lastT = moves.length ? moves[moves.length - 1].t : 0;
  const { currentTime, duration, playing, seek, play, pause, toggle, aspect, videoProps } = usePlayback({
    hasVideo,
    fallbackDuration: Math.max(lastT + 2, 3),
  });

  const currentIndex = moveIndexAt(moves, currentTime);
  const current = currentIndex >= 0 ? moves[currentIndex] : null;
  const sendChance = clampPercent(current?.send_chance ?? moves[0]?.send_chance ?? 50);

  const [expanded, setExpanded] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const selectMove = useCallback(
    (i: number) => {
      const m = moves[i];
      if (!m) return;
      seek(m.t);
      setExpanded(i);
    },
    [moves, seek],
  );

  const tapRow = useCallback(
    (i: number) => {
      const m = moves[i];
      if (!m) return;
      seek(m.t);
      setExpanded((e) => (e === i ? null : i));
    },
    [moves, seek],
  );

  const crux = !review.sent ? review.crux : null;
  const cruxT = crux?.t;
  const watchCrux = useCallback(() => {
    if (cruxT === undefined) return;
    const i = moves.findIndex((m) => Math.abs(m.t - cruxT) < 0.05);
    seek(cruxT);
    if (i >= 0) setExpanded(i);
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    play();
  }, [cruxT, moves, seek, play]);

  const stepPrev = () => {
    pause();
    if (currentIndex < 0) return seek(0);
    if (currentTime - moves[currentIndex].t > 0.75) return selectMove(currentIndex);
    if (currentIndex > 0) return selectMove(currentIndex - 1);
    seek(0);
    setExpanded(null);
  };

  const stepNext = () => {
    pause();
    if (currentIndex < moves.length - 1) selectMove(currentIndex + 1);
  };

  const notice =
    banner ??
    (review.fallback ? (
      <div className="rounded-2xl bg-inaccuracy/10 px-4 py-3 text-sm text-inaccuracy">
        We couldn&apos;t analyse that video, so this is a sample review.
      </div>
    ) : null);

  return (
    <div className="space-y-4 px-4 pb-6">
      <PageHeader title="Climb review" />

      {notice}

      <div className="space-y-2">
        <div ref={stageRef} className="flex scroll-mt-3 items-stretch gap-2">
          <SendBar chance={sendChance} />

          <div
            className="relative max-h-[55svh] min-w-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-line"
            style={{ aspectRatio: aspect ?? DEFAULT_ASPECT }}
          >
            {hasVideo ? (
              <video
                {...videoProps}
                src={src}
                playsInline
                muted
                preload="metadata"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <VirtualStage moves={moves} currentTime={currentTime} currentIndex={currentIndex} sent={review.sent} />
            )}

            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition duration-200 ${
                  playing ? "scale-75 opacity-0" : "scale-100 opacity-100"
                }`}
              >
                <PlayIcon className="ml-1 h-7 w-7" />
              </span>
            </button>

            <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex">
              <div
                key={currentIndex}
                className="flex max-w-full animate-fade-up items-start gap-2 rounded-2xl bg-black/65 py-2 pl-2 pr-3 backdrop-blur-md"
              >
                {current ? (
                  <>
                    <RatingBadge rating={current.rating} size="md" />
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold leading-tight ${RATING_META[current.rating].text}`}>
                        {RATING_META[current.rating].label} · Move {currentIndex + 1}
                      </p>
                      <p
                        className={`text-[13px] leading-snug text-white ${hasVideo ? "line-clamp-1" : "line-clamp-2"}`}
                      >
                        {current.move}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="py-0.5 pl-1 text-[13px] text-white/80">
                    {moves.length} moves · tap play to watch
                  </p>
                )}
              </div>
            </div>

            {!hasVideo && (
              <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Virtual replay
              </span>
            )}
          </div>
        </div>

        <Timeline
          moves={moves}
          duration={duration}
          currentTime={currentTime}
          currentIndex={currentIndex}
          onSeek={seek}
          onSelect={selectMove}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(252_76_2/0.35)] transition active:scale-95"
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
          </button>
          <p className="font-mono text-sm tabular-nums">
            <span className="text-ink">{formatTime(currentTime)}</span>
            <span className="text-faint"> / {formatTime(duration)}</span>
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={stepPrev}
              aria-label="Previous move"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink transition active:scale-95 active:bg-surface-2"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={stepNext}
              disabled={currentIndex >= moves.length - 1}
              aria-label="Next move"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink transition active:scale-95 active:bg-surface-2 disabled:opacity-40"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>
      </div>

      <SummaryCard review={review} counts={counts} />

      {crux && <CruxCard crux={crux} onWatch={watchCrux} />}

      <MoveList moves={moves} currentIndex={currentIndex} expanded={expanded} playing={playing} onRowTap={tapRow} />

      {footer}
    </div>
  );
}
