import { RATINGS, type Crux, type Move, type MoveRating, type Review } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** A finite number clamped to 0-100, or `fallback` when it isn't a number at all. */
function percent(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

function seconds(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

function rating(v: unknown): MoveRating | null {
  const r = str(v).toLowerCase();
  return (RATINGS as readonly string[]).includes(r) ? (r as MoveRating) : null;
}

function move(raw: unknown): Move | null {
  if (!isRecord(raw)) return null;
  const t = seconds(raw.t);
  const r = rating(raw.rating);
  if (t === null || r === null) return null;
  const better = str(raw.better);
  return {
    t,
    move: str(raw.move) || "Move",
    rating: r,
    why: str(raw.why),
    better: better || null,
    send_chance: percent(raw.send_chance, 50),
  };
}

function crux(raw: unknown): Crux | null {
  if (!isRecord(raw)) return null;
  const t = seconds(raw.t);
  if (t === null) return null;
  return { t, what_went_wrong: str(raw.what_went_wrong), try_this: str(raw.try_this) };
}

/**
 * Coerces untrusted review JSON (the model's output, or a cached copy from an
 * older build) into a Review that every screen can render safely. Moves with an
 * unknown rating or a bad timestamp are dropped; returns null when nothing
 * reviewable is left.
 */
export function normalizeReview(raw: unknown): Review | null {
  if (!isRecord(raw) || !Array.isArray(raw.moves)) return null;
  const moves = raw.moves.map(move).filter((m): m is Move => m !== null);
  if (moves.length === 0) return null;
  const review: Review = {
    sent: raw.sent === true || raw.sent === "true",
    accuracy: percent(raw.accuracy, 0),
    summary: str(raw.summary),
    crux: crux(raw.crux),
    moves,
  };
  if (raw.fallback === true) review.fallback = true;
  return review;
}
