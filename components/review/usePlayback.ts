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
    onEnded: () => void;
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

/**
 * One playback model for both a real video and the virtual stand-in, so the
 * review UI never needs to know which one it is driving.
 */
export function usePlayback({ hasVideo, fallbackDuration }: Options): Playback {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const duration = hasVideo && videoDuration ? videoDuration : fallbackDuration;

  // Mirrors for use inside callbacks and animation frames.
  const timeRef = useRef(0);
  const durationRef = useRef(duration);
  /** virtual clock anchor: at performance time `perf` the clock read `t` */
  const anchorRef = useRef({ perf: 0, t: 0 });

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Virtual clock.
  useEffect(() => {
    if (hasVideo || !playing) return;
    let raf = 0;
    const tick = (now: number) => {
      const { perf, t } = anchorRef.current;
      const next = t + Math.max(0, now - perf) / 1000;
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
      anchorRef.current = { perf: performance.now(), t: clamped };
      setCurrentTime(clamped);
      const v = videoRef.current;
      if (hasVideo && v) v.currentTime = clamped;
    },
    [hasVideo],
  );

  const play = useCallback(() => {
    if (timeRef.current >= durationRef.current - END_EPSILON) seek(0);
    if (hasVideo) {
      const v = videoRef.current;
      if (!v) return;
      // `playing` follows the element's own play/pause events.
      v.play().catch(() => setPlaying(false));
    } else {
      anchorRef.current = { perf: performance.now(), t: timeRef.current };
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
    if (Number.isFinite(v.duration) && v.duration > 0) setVideoDuration(v.duration);
    if (v.videoWidth > 0 && v.videoHeight > 0) setAspect(v.videoWidth / v.videoHeight);
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

  const onTimeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    timeRef.current = e.currentTarget.currentTime;
    setCurrentTime(e.currentTarget.currentTime);
  }, []);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onStop = useCallback(() => setPlaying(false), []);

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
      onPause: onStop,
      onEnded: onStop,
      onTimeUpdate,
    },
  };
}
