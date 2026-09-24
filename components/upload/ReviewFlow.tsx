"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/review/PageHeader";
import ReviewScreen from "@/components/review/ReviewScreen";
import SaveToProfile from "@/components/save/SaveToProfile";
import { extractFrames, UnreadableVideoError } from "@/lib/frames";
import { setLastReview } from "@/lib/storage";
import type { Frame, Review } from "@/lib/types";
import { FallbackBanner, ReviewedBanner } from "./Banners";
import FilmingTips from "./FilmingTips";
import { fitSampleToVideo } from "./fitSample";
import NoticeCard from "./NoticeCard";
import PickVideo from "./PickVideo";
import Processing from "./Processing";

const FRAME_COUNT = 12;
const REQUEST_TIMEOUT_MS = 70_000;
const LONG_VIDEO_S = 90;
const MIN_VIDEO_S = 1;

interface Job {
  frames: Frame[];
  duration: number;
}

type Phase =
  | { kind: "idle" }
  | { kind: "extracting"; progress: number; frames: Frame[] }
  | { kind: "analysing"; job: Job; startedAt: number }
  | { kind: "done"; job: Job; review: Review; id: number }
  | { kind: "unreadable"; detail: string }
  | { kind: "offline"; job: Job; timedOut: boolean };

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** A real (non-sample) answer with no moves: the coach couldn't see a climb in the frames. */
function sawNoClimb(review: Review): boolean {
  return !review.fallback && review.moves.length === 0;
}

export default function ReviewFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // In-flight work, so a new pick, a cancel or leaving the page stops it.
  const jobs = useRef<{ extract: AbortController | null; analyse: AbortController | null; seq: number }>({
    extract: null,
    analyse: null,
    seq: 0,
  });

  // Our own object URL for playback: revoked when replaced or on unmount.
  useEffect(() => {
    if (!videoUrl) return;
    return () => URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    const j = jobs.current;
    return () => {
      j.extract?.abort();
      j.analyse?.abort();
    };
  }, []);

  const analysing = phase.kind === "analysing";
  useEffect(() => {
    if (!analysing) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [analysing]);

  const stopAll = useCallback(() => {
    const j = jobs.current;
    j.extract?.abort();
    j.analyse?.abort();
    j.extract = null;
    j.analyse = null;
  }, []);

  const analyse = useCallback(async (job: Job) => {
    const j = jobs.current;
    j.analyse?.abort();
    const ac = new AbortController();
    j.analyse = ac;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, REQUEST_TIMEOUT_MS);

    const startedAt = Date.now();
    setNow(startedAt);
    setPhase({ kind: "analysing", job, startedAt });
    window.scrollTo({ top: 0 });

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Review;
      if (!data || !Array.isArray(data.moves)) throw new Error("Unexpected response");
      if (j.analyse !== ac) return;

      const review = data.fallback ? fitSampleToVideo(data, job.duration) : data;
      // Only real reviews of a real climb become the "last review" on the home screen.
      if (!data.fallback && !sawNoClimb(review)) {
        setLastReview({ review, source: "upload", created_at: Date.now() });
      }
      j.seq += 1;
      setPhase({ kind: "done", job, review, id: j.seq });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (j.analyse !== ac) return; // superseded by a newer request
      if (isAbort(err) && !timedOut) return; // cancelled
      console.warn("[review] request failed", err);
      setPhase({ kind: "offline", job, timedOut });
    } finally {
      window.clearTimeout(timer);
      if (j.analyse === ac) j.analyse = null;
    }
  }, []);

  const start = useCallback(
    async (file: File) => {
      stopAll();
      const ac = new AbortController();
      jobs.current.extract = ac;
      setVideoUrl(URL.createObjectURL(file));
      setAspect(null);
      setPhase({ kind: "extracting", progress: 0, frames: [] });
      window.scrollTo({ top: 0 });

      try {
        const result = await extractFrames(file, {
          count: FRAME_COUNT,
          signal: ac.signal,
          onProgress: (progress, frame) =>
            setPhase((p) =>
              p.kind === "extracting" ? { ...p, progress, frames: frame ? [...p.frames, frame] : p.frames } : p,
            ),
        });
        if (jobs.current.extract !== ac) return;
        jobs.current.extract = null;
        if (result.width && result.height) setAspect(result.width / result.height);
        if (result.duration < MIN_VIDEO_S) {
          throw new UnreadableVideoError("That video is under a second long");
        }
        void analyse({ frames: result.frames, duration: Math.round(result.duration * 10) / 10 });
      } catch (err) {
        if (ac.signal.aborted || isAbort(err)) return; // cancelled or replaced by a newer pick
        jobs.current.extract = null;
        console.warn("[review] couldn't read video", err);
        setPhase({
          kind: "unreadable",
          detail: err instanceof Error ? err.message : "The video couldn't be opened",
        });
      }
    },
    [analyse, stopAll],
  );

  const reset = useCallback(() => {
    stopAll();
    setVideoUrl(null);
    setAspect(null);
    setPhase({ kind: "idle" });
    window.scrollTo({ top: 0 });
  }, [stopAll]);

  if ((phase.kind === "extracting" || phase.kind === "analysing") && videoUrl) {
    const extracting = phase.kind === "extracting";
    const duration = extracting ? 0 : phase.job.duration;
    return (
      <Processing
        videoUrl={videoUrl}
        aspect={aspect}
        onAspect={setAspect}
        stage={extracting ? "extracting" : "analysing"}
        progress={extracting ? phase.progress : 1}
        frames={extracting ? phase.frames : phase.job.frames}
        total={FRAME_COUNT}
        elapsedMs={extracting ? 0 : Math.max(0, now - phase.startedAt)}
        longVideo={duration > LONG_VIDEO_S}
        onCancel={reset}
      />
    );
  }

  const pickAgain = (
    <>
      <PickVideo mode="record" onFile={start} />
      <PickVideo mode="library" onFile={start}>
        Pick a different video
      </PickVideo>
    </>
  );

  if (phase.kind === "done" && sawNoClimb(phase.review)) {
    return (
      <NoticeCard icon="eye" tone="inaccuracy" title="The coach couldn't see a climb" actions={pickAgain}>
        <div className="rounded-2xl bg-surface-2 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Coach</p>
          <p className="mt-1 text-ink/85">{phase.review.summary}</p>
        </div>
      </NoticeCard>
    );
  }

  if (phase.kind === "done") {
    const { review, job } = phase;
    const saveSlot = review.fallback ? null : <SaveToProfile review={review} />;
    return (
      <ReviewScreen
        key={phase.id}
        review={review}
        videoUrl={videoUrl}
        banner={
          review.fallback ? (
            <FallbackBanner reason={review.fallback_reason} onRetry={() => void analyse(job)} />
          ) : (
            <ReviewedBanner frames={job.frames.length} />
          )
        }
        footer={
          <div className="space-y-3 pt-2">
            {saveSlot}
            <PickVideo mode="record" variant="outline" onFile={start}>
              Film another attempt
            </PickVideo>
            <button
              type="button"
              onClick={reset}
              className="flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-muted transition active:bg-surface"
            >
              Review a different video
            </button>
          </div>
        }
      />
    );
  }

  if (phase.kind === "offline") {
    return (
      <NoticeCard
        icon="offline"
        title="Couldn't reach the coach"
        extraLink={
          <button type="button" onClick={reset} className="h-11 px-3 font-semibold text-muted">
            Start over
          </button>
        }
        actions={
          <button
            type="button"
            onClick={() => void analyse(phase.job)}
            className="flex h-14 w-full items-center justify-center rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)] transition active:scale-[0.98]"
          >
            Try again
          </button>
        }
      >
        {phase.timedOut
          ? "The review took too long to come back. Your video is still here, so give it another go."
          : "Check your signal and try again. Your video is still here."}
      </NoticeCard>
    );
  }

  if (phase.kind === "unreadable") {
    return (
      <NoticeCard icon="video" title="We couldn't read that video" actions={pickAgain}>
        <p>
          Your phone may have saved it in a format this browser can&apos;t open. Film it straight from here with
          “Record a climb”, or pick a different video.
        </p>
        <p className="mt-2 text-xs text-faint">{phase.detail}</p>
      </NoticeCard>
    );
  }

  return (
    <div className="px-4 pb-6">
      <PageHeader title="Review my climb" />

      <h2 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-tight">
        Film one attempt. See how efficiently you climbed.
      </h2>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">
        Hand your phone to a friend and climb. The coach rates every move on technique and efficiency, finds where the
        attempt fell apart, and tells you what to try next.
      </p>

      <div className="mt-6 space-y-3">
        <PickVideo mode="record" onFile={start} />
        <PickVideo mode="library" onFile={start} />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-faint">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Your video stays on your phone. Only {FRAME_COUNT} stills are sent.
      </p>

      <div className="mt-8">
        <FilmingTips />
      </div>

      <Link
        href="/review/sample"
        className="mt-4 flex h-12 items-center justify-center gap-1.5 text-[15px] font-semibold text-brand"
      >
        No video handy? See a sample review
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </div>
  );
}
