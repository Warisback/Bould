"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RATINGS, type MoveRating, type Review } from "@/lib/types";
import { RATING_META } from "@/lib/ratings";
import CoachPanel from "./CoachPanel";
import CruxCard from "./CruxCard";
import { clampPercent, formatTime, moveIndexAt } from "./format";
import MoveList from "./MoveList";
import PageHeader from "./PageHeader";
import RatingBadge from "./RatingBadge";
import SendBar from "./SendBar";
import { DEFAULT_ASPECT, stageBoxStyle } from "./stage";
import SummaryCard from "./SummaryCard";
import Timeline from "./Timeline";
import { usePlayback } from "./usePlayback";
import VirtualStage from "./VirtualStage";
import { afterScroll, isFullyVisible } from "./viewport";

export interface ReviewScreenProps {
  review: Review;
  videoUrl?: string | null;
  footer?: ReactNode;
  /** one line under the title, e.g. "Sample climb · a V4 fall at Aldgate" */
  subtitle?: ReactNode;
  /** a longer note, shown below the replay so it never pushes the controls under the nav */
  banner?: ReactNode;
}

/** "Watch" starts at the previous move when it is at most this many seconds back... */
const LEAD_MAX = 3;
/** ...otherwise this long before the move. */
const LEAD_IN = 2.5;

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

export default function ReviewScreen({ review, videoUrl, footer, subtitle, banner }: ReviewScreenProps) {
  const sorted = useMemo(() => [...review.moves].sort((a, b) => a.t - b.t), [review.moves]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(RATINGS.map((r) => [r, 0])) as Record<MoveRating, number>;
    for (const m of sorted) c[m.rating] += 1;
    return c;
  }, [sorted]);

  const hasVideo = Boolean(videoUrl);
  // iOS Safari only paints a first frame when asked for a time offset.
  const src = videoUrl && !videoUrl.includes("#") ? `${videoUrl}#t=0.001` : videoUrl ?? undefined;
  const lastT = sorted.length ? sorted[sorted.length - 1].t : 0;
  const crux = !review.sent ? review.crux : null;
  const { currentTime, duration, playing, seek, play, pause, toggle, aspect, videoProps } = usePlayback({
    hasVideo,
    // The crux can come after the last rated move (the fall itself).
    fallbackDuration: Math.max(lastT, crux?.t ?? 0, 1) + 2,
  });

  // With a real video, the model's timestamps can run past the end of the clip.
  // Squeeze them into it so every move stays reachable and in order.
  const timeScale = hasVideo && lastT > 0 && lastT > duration - 0.1 ? Math.max(0, duration - 0.1) / lastT : 1;
  const moves = useMemo(
    () => (timeScale === 1 ? sorted : sorted.map((m) => ({ ...m, t: m.t * timeScale }))),
    [sorted, timeScale],
  );

  const currentIndex = moveIndexAt(moves, currentTime);
  const current = currentIndex >= 0 ? moves[currentIndex] : null;
  const sendChance = clampPercent(current?.send_chance ?? moves[0]?.send_chance ?? 50);

  const [expanded, setExpanded] = useState<number | null>(null);
  // The coach shows the move on the stage; a selected move wins when it is the
  // one at the playhead (e.g. two moves share a timestamp).
  const coachIndex =
    expanded !== null && moves[expanded] && moveIndexAt(moves, moves[expanded].t) === currentIndex
      ? expanded
      : currentIndex;

  const stageRef = useRef<HTMLDivElement>(null);
  /** cancels a "watch" that is waiting for its scroll to finish */
  const pendingWatch = useRef<(() => void) | null>(null);
  const cancelPendingWatch = useCallback(() => {
    pendingWatch.current?.();
    pendingWatch.current = null;
  }, []);
  useEffect(() => cancelPendingWatch, [cancelPendingWatch]);

  const selectMove = useCallback(
    (i: number) => {
      const m = moves[i];
      if (!m) return;
      cancelPendingWatch();
      seek(m.t);
      setExpanded(i);
    },
    [moves, seek, cancelPendingWatch],
  );

  const tapRow = useCallback(
    (i: number) => {
      const m = moves[i];
      if (!m) return;
      cancelPendingWatch();
      seek(m.t);
      setExpanded((e) => (e === i ? null : i));
    },
    [moves, seek, cancelPendingWatch],
  );

  /**
   * Replay a move from a little before it: bring the stage into view, then play
   * once the scroll has settled so the move isn't over before it can be seen.
   */
  const watchMove = useCallback(
    (i: number) => {
      const m = moves[i];
      if (!m) return;
      cancelPendingWatch();
      pause();
      const prevT = i > 0 ? moves[i - 1].t : 0;
      const leadIn = m.t - prevT <= LEAD_MAX ? prevT : m.t - LEAD_IN;
      // Never start inside the end window, where play() would rewind to 0:00.
      seek(Math.max(0, Math.min(leadIn, duration - 1.5)));
      setExpanded(i);
      const stage = stageRef.current;
      if (!stage || isFullyVisible(stage)) {
        play();
        return;
      }
      stage.scrollIntoView({ behavior: "smooth", block: "start" });
      pendingWatch.current = afterScroll(() => {
        pendingWatch.current = null;
        play();
      });
    },
    [moves, duration, seek, play, pause, cancelPendingWatch],
  );

  const cruxT = crux ? crux.t * timeScale : undefined;
  const watchCrux = useCallback(() => {
    if (cruxT === undefined || moves.length === 0) return;
    // The move nearest the crux, so the seek, the highlight and the open row agree.
    const i = moves.reduce((best, m, k) => (Math.abs(m.t - cruxT) < Math.abs(moves[best].t - cruxT) ? k : best), 0);
    watchMove(i);
  }, [cruxT, moves, watchMove]);

  const togglePlay = () => {
    cancelPendingWatch();
    toggle();
  };

  const stepPrev = () => {
    cancelPendingWatch();
    pause();
    if (currentIndex < 0) return seek(0);
    if (currentTime - moves[currentIndex].t > 0.75) return selectMove(currentIndex);
    if (currentIndex > 0) return selectMove(currentIndex - 1);
    seek(0);
    setExpanded(null);
  };

  const stepNext = () => {
    cancelPendingWatch();
    pause();
    if (currentIndex < moves.length - 1) selectMove(currentIndex + 1);
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      <PageHeader
        title="Climb review"
        subtitle={
          review.fallback ? <span className="text-inaccuracy">Sample review · we couldn&apos;t analyse your video</span> : subtitle
        }
      />

      <div className="space-y-2">
        <div ref={stageRef} className="flex scroll-mt-[calc(env(safe-area-inset-top)_+_12px)] justify-center gap-2">
          <SendBar chance={sendChance} />

          <div
            className="relative shrink-0 overflow-hidden rounded-2xl bg-black ring-1 ring-line"
            style={stageBoxStyle(aspect ?? DEFAULT_ASPECT)}
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
              onClick={togglePlay}
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

          </div>
        </div>

        <Timeline
          moves={moves}
          duration={duration}
          currentTime={currentTime}
          currentIndex={currentIndex}
          onSeek={(t) => {
            cancelPendingWatch();
            seek(t);
          }}
          onSelect={selectMove}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(252_76_2/0.35)] transition active:scale-95"
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
          </button>
          <div className="leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Send</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {sendChance}
              <span className="text-sm text-muted">%</span>
            </p>
          </div>
          <div className="leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Time</p>
            <p className="mt-1.5 font-mono text-sm tabular-nums">
              <span className="text-ink">{formatTime(currentTime)}</span>
              <span className="text-muted"> / {formatTime(duration)}</span>
            </p>
          </div>
          <div className="ml-auto flex shrink-0 gap-2">
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

      <CoachPanel move={coachIndex >= 0 ? moves[coachIndex] : null} index={coachIndex} total={moves.length} />

      {review.fallback && (
        <div className="rounded-2xl bg-inaccuracy/10 px-4 py-3 text-sm text-inaccuracy">
          We couldn&apos;t analyse that video, so this is a sample review, not your climb.
        </div>
      )}

      {banner}

      <SummaryCard review={review} counts={counts} />

      {crux && <CruxCard crux={crux} onWatch={watchCrux} />}

      <MoveList
        moves={moves}
        currentIndex={currentIndex}
        expanded={expanded}
        playing={playing}
        onRowTap={tapRow}
        onWatch={watchMove}
      />

      {footer}
    </div>
  );
}
