"use client";

import { useEffect, useRef } from "react";
import PageHeader from "@/components/review/PageHeader";
import type { Frame } from "@/lib/types";

const COACH_LINES = [
  "Mapping your moves from the start holds up",
  "Checking your hips stay close to the wall",
  "Looking for straight arms between moves",
  "Watching your feet: precise, quiet placements?",
  "Spotting hesitation and over-gripping",
  "Checking flags, heel hooks and drop knees",
  "Finding energy you spent that you didn't need to",
  "Working out your send chance, move by move",
  "Rating every move, brilliant to blunder",
];
const LINE_MS = 3_500;
const SWEEP_MS = 500;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Filmstrip({
  frames,
  total,
  aspect,
  active,
}: {
  frames: readonly Frame[];
  total: number;
  aspect: number;
  /** index of the highlighted frame while the coach "scans", or -1 */
  active: number;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const f = frames[i];
        if (!f) {
          return (
            <div
              key={i}
              className={`rounded-lg bg-surface-2 ${i === frames.length ? "animate-pulse" : ""}`}
              style={{ aspectRatio: aspect }}
            />
          );
        }
        const lit = active === -1 || active === i;
        return (
          <div
            key={i}
            className={`animate-pop-in rounded-lg bg-surface-2 bg-cover bg-center transition duration-300 ${
              lit ? "opacity-100" : "opacity-45"
            } ${active === i ? "ring-2 ring-brand" : ""}`}
            style={{ aspectRatio: aspect, backgroundImage: `url(data:image/jpeg;base64,${f.data})` }}
          />
        );
      })}
    </div>
  );
}

export default function Processing({
  videoUrl,
  aspect,
  onAspect,
  stage,
  progress,
  frames,
  total,
  elapsedMs,
  longVideo,
  onCancel,
}: {
  videoUrl: string;
  aspect: number | null;
  onAspect: (aspect: number) => void;
  stage: "extracting" | "analysing";
  /** 0-1, extraction only */
  progress: number;
  frames: readonly Frame[];
  total: number;
  /** analysis only */
  elapsedMs: number;
  longVideo: boolean;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysing = stage === "analysing";

  // Loop the climb quietly while the coach works (muted inline autoplay is allowed on iOS).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (analysing) v.play().catch(() => undefined);
    else v.pause();
  }, [analysing]);

  const done = Math.round(progress * total);
  const previewAspect = aspect ?? 0.75;
  const tileAspect = Math.min(1.78, Math.max(0.66, previewAspect));
  const line = COACH_LINES[Math.floor(elapsedMs / LINE_MS) % COACH_LINES.length];
  const sweep = analysing && frames.length ? Math.floor(elapsedMs / SWEEP_MS) % frames.length : -1;
  // iOS Safari only paints a first frame when asked for a time offset.
  const src = videoUrl.includes("#") ? videoUrl : `${videoUrl}#t=0.001`;

  return (
    <div className="px-4 pb-6">
      <style>{`@keyframes br-scan{0%{transform:translateY(-100%)}100%{transform:translateY(340%)}}`}</style>
      <PageHeader title="Review my climb" />

      <div
        className="relative mx-auto overflow-hidden rounded-3xl bg-black ring-1 ring-line"
        style={{ aspectRatio: previewAspect, width: `min(100%, calc(34svh * ${previewAspect}))` }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          loop
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) onAspect(v.videoWidth / v.videoHeight);
          }}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {analysing && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[30%] animate-[br-scan_2.6s_ease-in-out_infinite] border-b-2 border-brand bg-gradient-to-b from-transparent to-brand/25 motion-reduce:hidden"
            aria-hidden
          />
        )}
        <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          <span className={`h-2 w-2 rounded-full bg-brand ${analysing ? "animate-live-pulse" : ""}`} />
          {analysing ? "Reviewing" : "Reading frames"}
        </span>
      </div>

      <section className="mt-4 rounded-3xl bg-surface p-5" aria-live="polite">
        {analysing ? (
          <>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold leading-tight">Coach is reviewing your climb</p>
              <p className="ml-auto font-mono text-sm tabular-nums text-muted">{formatElapsed(elapsedMs)}</p>
            </div>
            <p key={line} className="mt-2 min-h-[2.8em] animate-fade-up text-[15px] leading-snug text-muted">
              {line}…
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold leading-tight">Reading your climb…</p>
              <p className="font-mono text-sm tabular-nums text-muted">
                {done}/{total}
              </p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label="Frames read"
            >
              <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-2.5 text-sm leading-snug text-muted">
              Picking {total} moments from your video. The video itself never leaves your phone.
            </p>
          </>
        )}

        <div className="mt-4">
          <Filmstrip frames={frames} total={analysing ? frames.length : total} aspect={tileAspect} active={sweep} />
        </div>

        {longVideo && (
          <p className="mt-4 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[13px] leading-snug text-muted">
            Long video: the coach only sees {total} moments across it. Trim it to one attempt for a sharper review.
          </p>
        )}
      </section>

      <div className="mt-2 flex items-center justify-center gap-1 text-[13px] text-faint">
        <span>{analysing ? "Usually 15–40 seconds. Keep this screen open." : "This takes a few seconds."}</span>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center rounded-full px-3 font-semibold text-muted underline-offset-4 transition active:bg-surface"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
