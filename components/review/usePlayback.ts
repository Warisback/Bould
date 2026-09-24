"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";

export interface Playback {
  currentTime: number;
  duration: number;
  playing: boolean;
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** width / height of the real video once its metadata loads, else null */
  aspect: number | null;
  /** spread onto the <video> element in video mode */
  videoProps: {
    ref: React.RefObject<HTMLVideoElement | null>;
    onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => void;
    onDurationChange: (e: SyntheticEvent<HTMLVideoElement>) => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: (e: SyntheticEvent<HTMLVideoElement>) => void;
    onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => void;
  };
}

interface Options {
  /** true: drive a real <video>; false: run a virtual requestAnimationFrame clock */
  hasVideo: boolean;
  /** used for virtual mode, and for video mode until metadata arrives */
  fallbackDuration: number;
}

const END_EPSILON = 0.05;
/** longest step the virtual clock takes in one frame */
const MAX_STEP_MS = 100;

/**
 * One playback model for both a real video and the virtual stand-in, so the
 * review UI never needs to know which one it is driving.
 */
export function usePlayback({ hasVideo, fallbackDuration }: Options): Playback {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** the element's own duration, once it reports a finite one */
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  /** furthest point played so far, for videos whose duration is Infinity/NaN (MediaRecorder WebM) */
  const [seenEnd, setSeenEnd] = useState(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const duration = hasVideo ? (videoDuration ?? Math.max(fallbackDuration, seenEnd)) : fallbackDuration;

  // Mirrors for use inside callbacks and animation frames.
  const timeRef = useRef(0);
  const durationRef = useRef(duration);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Virtual clock. It adds up clamped per-frame steps rather than measuring
  // from a fixed start, so a locked phone or a trip to another app (which
  // pauses requestAnimationFrame) resumes where it left off instead of
  // jumping to the end.
  useEffect(() => {
    if (hasVideo || !playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = Math.min(Math.max(0, now - last), MAX_STEP_MS) / 1000;
      last = Math.max(last, now);
      const next = timeRef.current + step;
      const end = durationRef.current;
      if (next >= end) {
        timeRef.current = end;
        setCurrentTime(end);
        setPlaying(false);
        return;
      }
      timeRef.current = next;
      setCurrentTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasVideo, playing]);

  // Real video: sample currentTime every frame while playing for a smooth playhead
  // (timeupdate alone only fires ~4 times a second).
  useEffect(() => {
    if (!hasVideo || !playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        timeRef.current = v.currentTime;
        setCurrentTime(v.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasVideo, playing]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(Math.max(0, t), durationRef.current);
      timeRef.current = clamped;
      setCurrentTime(clamped);
      const v = videoRef.current;
      if (hasVideo && v) v.currentTime = clamped;
    },
    [hasVideo],
  );

  const play = useCallback(() => {
    if (hasVideo) {
      const v = videoRef.current;
      if (!v) return;
      // Rewind only when the element itself has finished: our duration can be
      // a stand-in (no metadata yet, or an Infinity-duration WebM).
      if (v.ended) seek(0);
      // `playing` follows the element's own play/pause events.
      v.play().catch(() => setPlaying(false));
    } else {
      if (timeRef.current >= durationRef.current - END_EPSILON) seek(0);
      setPlaying(true);
    }
  }, [hasVideo, seek]);

  const pause = useCallback(() => {
    if (hasVideo) videoRef.current?.pause();
    else setPlaying(false);
  }, [hasVideo]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

  const applyMeta = useCallback((v: HTMLVideoElement) => {
    if (Number.isFinite(v.duration) && v.duration > 0) {
      setVideoDuration(v.duration);
    } else if (v.seekable.length > 0) {
      // No duration in the header: the seekable range is the next best thing.
      const end = v.seekable.end(v.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) setSeenEnd((prev) => Math.max(prev, end));
    }
    if (v.videoWidth > 0 && v.videoHeight > 0) setAspect(v.videoWidth / v.videoHeight);
  }, []);

  /** Without a finite duration, stretch our stand-in so the played part can always be reached. */
  const noteProgress = useCallback((v: HTMLVideoElement) => {
    if (!Number.isFinite(v.duration) && v.currentTime > 0) setSeenEnd((prev) => Math.max(prev, v.currentTime));
  }, []);

  const readMeta = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => applyMeta(e.currentTarget),
    [applyMeta],
  );

  // A server-rendered <video> can load its metadata before hydration attaches
  // our handlers, so check once after mount as well.
  useEffect(() => {
    const v = videoRef.current;
    if (!hasVideo || !v || v.readyState < 1) return;
    const raf = requestAnimationFrame(() => applyMeta(v));
    return () => cancelAnimationFrame(raf);
  }, [hasVideo, applyMeta]);

  const onTimeUpdate = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      timeRef.current = v.currentTime;
      setCurrentTime(v.currentTime);
      noteProgress(v);
    },
    [noteProgress],
  );

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onEnded = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => {
      setPlaying(false);
      applyMeta(e.currentTarget);
      noteProgress(e.currentTarget);
    },
    [applyMeta, noteProgress],
  );

  return {
    currentTime,
    duration,
    playing,
    seek,
    play,
    pause,
    toggle,
    aspect: hasVideo ? aspect : null,
    videoProps: {
      ref: videoRef,
      onLoadedMetadata: readMeta,
      onDurationChange: readMeta,
      onPlay,
      onPause,
      onEnded,
      onTimeUpdate,
    },
  };
}
