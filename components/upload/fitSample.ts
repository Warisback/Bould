import type { Review } from "@/lib/types";

/** Seconds of video the sample runs on after its last move. */
const SAMPLE_TAIL = 1.5;

/**
 * Stretches or squashes the sample review's timestamps onto a real video's
 * length, so its dots line up with the climber's video when we fall back.
 */
export function fitSampleToVideo(review: Review, duration: number): Review {
  const lastT = Math.max(0, ...review.moves.map((m) => m.t), review.crux?.t ?? 0);
  if (!Number.isFinite(duration) || duration <= 0 || lastT <= 0) return review;
  const k = duration / (lastT + SAMPLE_TAIL);
  const scale = (t: number) => Math.round(Math.min(duration, Math.max(0, t * k)) * 10) / 10;
  return {
    ...review,
    moves: review.moves.map((m) => ({ ...m, t: scale(m.t) })),
    crux: review.crux ? { ...review.crux, t: scale(review.crux.t) } : null,
  };
}

const REASONS: Record<string, string> = {
  busy: "The coach is swamped right now and couldn't get to your climb.",
  no_key: "The coach isn't switched on for this site yet.",
  bad_input: "Your frames didn't reach the coach in one piece.",
  error: "Something went wrong while the coach was looking at your climb.",
};

export function fallbackMessage(reason?: string): string {
  return REASONS[reason ?? ""] ?? REASONS.error;
}
