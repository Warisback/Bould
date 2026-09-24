"use client";

import type { Frame } from "./types";

/**
 * Pulls evenly spaced JPEG stills out of a video file, in the browser.
 * Written for iOS Safari first: muted + playsinline video, a decoded frame
 * before every draw (or iOS paints black), and generous timeouts.
 */

export interface ExtractOptions {
  /** number of frames, default 12 */
  count?: number;
  /** longest allowed width in px, default 640 */
  maxWidth?: number;
  /** longest allowed height in px, default 960 (keeps portrait phone videos light) */
  maxHeight?: number;
  /** JPEG quality 0-1, default 0.7 */
  quality?: number;
  /** re-encode smaller if the frames' base64 adds up to more than this, default 3.5MB */
  maxTotalBytes?: number;
  /** called after each frame is attempted; `frame` is undefined when that timestamp was skipped */
  onProgress?: (progress: number, frame?: Frame) => void;
  signal?: AbortSignal;
}

export interface ExtractResult {
  frames: Frame[];
  duration: number;
  width: number;
  height: number;
}

/** Thrown when the browser cannot decode the video at all (e.g. HEVC on desktop Chrome). */
export class UnreadableVideoError extends Error {
  name = "UnreadableVideoError";
}

const JPEG_PREFIX = /^data:image\/jpeg;base64,/;
const LOAD_TIMEOUT_MS = 15_000;
const SEEK_TIMEOUT_MS = 4_000;
const FRAME_WAIT_MS = 300;

const round1 = (n: number) => Math.round(n * 10) / 10;
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function abortError(): DOMException {
  return new DOMException("Frame extraction was cancelled", "AbortError");
}

/**
 * Resolves on the first of `events` (true) or after `ms` (false).
 * Rejects on the video's `error` event or on abort.
 */
function waitFor(
  video: HTMLVideoElement,
  events: string[],
  ms: number,
  signal?: AbortSignal,
  ready?: () => boolean,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    if (ready?.()) return resolve(true);
    let timer = 0;
    const done = (fn: () => void) => {
      window.clearTimeout(timer);
      for (const e of events) video.removeEventListener(e, onEvent);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const onEvent = () => {
      if (!ready || ready()) done(() => resolve(true));
    };
    const onError = () => done(() => reject(new UnreadableVideoError(videoErrorMessage(video))));
    const onAbort = () => done(() => reject(abortError()));
    for (const e of events) video.addEventListener(e, onEvent);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
    timer = window.setTimeout(() => done(() => resolve(false)), ms);
  });
}

function videoErrorMessage(video: HTMLVideoElement): string {
  const code = video.error?.code;
  if (code === 4) return "This browser can't play this video format";
  if (code === 3) return "The video couldn't be decoded";
  return video.error?.message || "The video couldn't be opened";
}

/** Waits until the frame at the current position has actually been decoded and composited. */
function waitForDecodedFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    window.setTimeout(finish, FRAME_WAIT_MS);
    const v = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    if (typeof v.requestVideoFrameCallback === "function") {
      v.requestVideoFrameCallback(() => finish());
    } else {
      // Two animation frames: one to schedule the paint, one after it lands.
      requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(finish, 30)));
    }
  });
}

async function seekTo(video: HTMLVideoElement, t: number, signal?: AbortSignal): Promise<boolean> {
  const seeked = waitFor(video, ["seeked"], SEEK_TIMEOUT_MS, signal);
  video.currentTime = t;
  return seeked;
}

/** MediaRecorder webm files often report duration = Infinity until the end has been seen. */
async function resolveDuration(video: HTMLVideoElement, signal?: AbortSignal): Promise<number> {
  const ok = () => Number.isFinite(video.duration) && video.duration > 0;
  if (ok()) return video.duration;
  const found = waitFor(video, ["durationchange", "timeupdate", "seeked"], 6_000, signal, ok);
  video.currentTime = 1e7;
  await found;
  if (!ok()) throw new UnreadableVideoError("Couldn't work out how long the video is");
  const duration = video.duration;
  await seekTo(video, 0, signal);
  return duration;
}

/** True when the frame, shrunk to 16x16, is all but black. */
function looksBlank(source: CanvasImageSource, probe: CanvasRenderingContext2D | null): boolean {
  if (!probe) return false;
  try {
    probe.drawImage(source, 0, 0, 16, 16);
    const { data } = probe.getImageData(0, 0, 16, 16);
    for (let p = 0; p < data.length; p += 4) {
      if (data[p] > 12 || data[p + 1] > 12 || data[p + 2] > 12) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function fitSize(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(2, Math.round(w * scale)), height: Math.max(2, Math.round(h * scale)) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("couldn't reload a frame"));
    img.src = src;
  });
}

/** Re-encodes already-extracted frames smaller and at lower quality. */
async function shrinkFrames(frames: Frame[], maxW: number, maxH: number, quality: number): Promise<Frame[]> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return frames;
  const out: Frame[] = [];
  for (const f of frames) {
    const img = await loadImage(`data:image/jpeg;base64,${f.data}`);
    const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, maxW, maxH);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    out.push({ t: f.t, data: canvas.toDataURL("image/jpeg", quality).replace(JPEG_PREFIX, "") });
  }
  return out;
}

const payloadSize = (frames: Frame[]) => frames.reduce((n, f) => n + f.data.length + 24, 64);

export async function extractFrames(file: File | Blob, opts: ExtractOptions = {}): Promise<ExtractResult> {
  const {
    count = 12,
    maxWidth = 640,
    maxHeight = 960,
    quality = 0.7,
    maxTotalBytes = 3_500_000,
    onProgress,
    signal,
  } = opts;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  // iOS Safari only decodes inline, muted video without a user gesture: set both
  // the attributes and the properties.
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("preload", "auto");
  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.preload = "auto";
  // Some iOS versions won't decode frames for a detached or display:none video,
  // so keep it in the document but invisible.
  video.style.cssText =
    "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(video);

  try {
    const meta = waitFor(video, ["loadedmetadata"], LOAD_TIMEOUT_MS, signal, () => video.readyState >= 1);
    video.src = url;
    video.load();
    if (!(await meta)) throw new UnreadableVideoError("The video took too long to open");

    const hasData = () => video.readyState >= 2;
    if (!(await waitFor(video, ["loadeddata"], 1_500, signal, hasData))) {
      // iOS may hold off decoding until playback is requested. Muted inline play is allowed;
      // don't trust the play() promise to settle, though.
      await Promise.race([video.play().catch(() => undefined), sleep(1_500)]);
      video.pause();
      await waitFor(video, ["loadeddata", "canplay"], 3_000, signal, hasData);
    }

    if (!video.videoWidth || !video.videoHeight) {
      throw new UnreadableVideoError("This video has no picture this browser can read");
    }

    const duration = await resolveDuration(video, signal);
    const { width, height } = fitSize(video.videoWidth, video.videoHeight, maxWidth, maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = 16;
    probeCanvas.height = 16;
    const probe = probeCanvas.getContext("2d", { willReadFrequently: true });

    let frames: Frame[] = [];
    for (let i = 0; i < count; i++) {
      if (signal?.aborted) throw abortError();
      const t = (duration * (i + 0.5)) / count;
      const seeked = await seekTo(video, t, signal);
      let frame: Frame | undefined;
      if (seeked) {
        await waitForDecodedFrame(video);
        ctx.drawImage(video, 0, 0, width, height);
        if (looksBlank(canvas, probe)) {
          // iOS sometimes hands over a black frame straight after a seek: give it one more go.
          await sleep(250);
          await waitForDecodedFrame(video);
          ctx.drawImage(video, 0, 0, width, height);
        }
        frame ={ t: round1(t), data: canvas.toDataURL("image/jpeg", quality).replace(JPEG_PREFIX, "") };
        frames.push(frame);
      }
      onProgress?.((i + 1) / count, frame);
    }

    if (frames.length === 0) throw new UnreadableVideoError("Couldn't read any frames from this video");

    if (payloadSize(frames) > maxTotalBytes) {
      frames = await shrinkFrames(frames, 480, 720, 0.5);
    }

    return { frames, duration, width: video.videoWidth, height: video.videoHeight };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  }
}
