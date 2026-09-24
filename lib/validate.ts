import { GYMS } from "./ratings";
import { RATINGS, type AttemptType, type Crux, type GymId, type Move, type MoveRating, type Review } from "./types";

const MAX_TEXT = 2000;
const MAX_MOVES = 80;

function text(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s.slice(0, max) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function parseMove(v: unknown): Move | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const t = num(o.t);
  const move = text(o.move, 300);
  const why = typeof o.why === "string" ? o.why.slice(0, MAX_TEXT) : null;
  const sendChance = num(o.send_chance);
  const rating = o.rating;
  if (t === null || t < 0 || move === null || why === null || sendChance === null) return null;
  if (typeof rating !== "string" || !(RATINGS as readonly string[]).includes(rating)) return null;
  const better = o.better == null ? null : text(o.better);
  return {
    t,
    move,
    rating: rating as MoveRating,
    why,
    better,
    send_chance: clamp(sendChance, 0, 100),
  };
}

function parseCrux(v: unknown): Crux | null | undefined {
  if (v == null) return null;
  if (typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const t = num(o.t);
  const wrong = text(o.what_went_wrong);
  const tryThis = text(o.try_this);
  if (t === null || wrong === null || tryThis === null) return undefined;
  return { t, what_went_wrong: wrong, try_this: tryThis };
}

/** A clean copy of a review with only known fields, or null when the shape is wrong. */
export function parseReview(v: unknown): Review | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.sent !== "boolean") return null;
  const accuracy = num(o.accuracy);
  if (accuracy === null || accuracy < 0 || accuracy > 100) return null;
  const summary = typeof o.summary === "string" ? o.summary.slice(0, MAX_TEXT) : null;
  if (summary === null) return null;
  const crux = parseCrux(o.crux);
  if (crux === undefined) return null;
  if (!Array.isArray(o.moves) || o.moves.length === 0 || o.moves.length > MAX_MOVES) return null;
  const moves: Move[] = [];
  for (const m of o.moves) {
    const parsed = parseMove(m);
    if (!parsed) return null;
    moves.push(parsed);
  }
  const review: Review = { sent: o.sent, accuracy, summary, crux, moves };
  if (o.fallback === true) review.fallback = true;
  return review;
}

/** Trimmed, single-spaced climber name of 2-20 characters, or null. */
export function parseName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Drop control characters, collapse whitespace.
  const printable = Array.from(v)
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 0x20 || c === 0x7f ? " " : ch;
    })
    .join("");
  const s = printable.replace(/\s+/g, " ").trim();
  const len = [...s].length;
  return len >= 2 && len <= 20 ? s : null;
}

export function parseGym(v: unknown): GymId | null {
  if (v === undefined || v === null || v === "") return "aldgate";
  return typeof v === "string" && Object.hasOwn(GYMS, v) ? (v as GymId) : null;
}

export function parseGrade(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 8 ? v : null;
}

export function parseAttemptType(v: unknown): AttemptType | null {
  return v === "flash" || v === "project" ? v : null;
}

/** Ids are UUIDs or seed ids: keep them short and key-safe. */
export function parseId(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null;
}
