import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel, Type, type Part, type Schema } from "@google/genai";
import { RATINGS, type Crux, type Frame, type Move, type MoveRating, type Review } from "./types";

/**
 * Server-side climb review with Gemini: the response schema, the coaching
 * prompt, normalisation of the answer, and a deadline-aware call that falls
 * back across several Flash models when they are busy.
 */

const DEFAULT_MODEL = "gemini-3.8-flash";
/**
 * Tried in order (skipping duplicates) when the main model is busy, unavailable
 * or slow. Override with GEMINI_BACKUP_MODELS="a,b,c".
 */
const BACKUP_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3-flash-preview"];

/** Whole call, including retries. Keeps the route well inside maxDuration = 60. */
export const REVIEW_DEADLINE_MS = 50_000;
/** Every this-long without an answer, one more model may run alongside the pending ones. */
const HEDGE_AFTER_MS = 10_000;
/** Don't bother starting an attempt with less time than this left. */
const MIN_ATTEMPT_MS = 8_000;
/** Pause before asking a model that just said "busy" again (grows per failure). */
const RETRY_BACKOFF_MS = 2_000;
const MAX_ATTEMPTS = 12;

const MAX_MOVES = 30;

export const REVIEW_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sent: {
      type: Type.BOOLEAN,
      description: "True only if the climber clearly tops out: both hands controlled on the finish hold.",
    },
    accuracy: {
      type: Type.NUMBER,
      description: "Overall execution quality 0-100, like chess accuracy.",
    },
    summary: {
      type: Type.STRING,
      description: "Three to five short sentences on how efficiently they climbed, in second person.",
    },
    crux: {
      type: Type.OBJECT,
      nullable: true,
      description: "Null if they sent. Otherwise the move where the attempt fell apart.",
      properties: {
        t: { type: Type.NUMBER, description: "Seconds from the start of the video." },
        what_went_wrong: { type: Type.STRING },
        try_this: { type: Type.STRING },
      },
      required: ["t", "what_went_wrong", "try_this"],
      propertyOrdering: ["t", "what_went_wrong", "try_this"],
    },
    moves: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.NUMBER, description: "Seconds from the start of the video, from the frame timestamps." },
          move: { type: Type.STRING, description: "What the climber did, in a few words." },
          rating: { type: Type.STRING, enum: [...RATINGS] },
          why: { type: Type.STRING },
          better: {
            type: Type.STRING,
            nullable: true,
            description: "Null for brilliant, great and good. A concrete alternative otherwise.",
          },
          send_chance: {
            type: Type.NUMBER,
            description: "0-100 chance of topping out from this point.",
          },
        },
        required: ["t", "move", "rating", "why", "better", "send_chance"],
        propertyOrdering: ["t", "move", "rating", "why", "better", "send_chance"],
      },
    },
  },
  required: ["sent", "accuracy", "summary", "crux", "moves"],
  propertyOrdering: ["sent", "accuracy", "summary", "crux", "moves"],
};

function buildPrompt(frameCount: number, duration: number): string {
  return `You are an expert bouldering coach. Review this climb the way a chess engine reviews a game: move by move, honestly, with a rating for every move.

You are given ${frameCount} still frames from one video of a real person climbing a boulder problem at an indoor gym. The video is ${duration.toFixed(1)} seconds long and each frame is labelled with its timestamp. Frames are evenly spaced, so fill the gaps between them with sensible inferences, but never invent holds, grades or events you cannot see.

What the climber wants to know: was this climb as EFFICIENT as possible, and what exactly should they change next time?

How to review:
- Split the climb into moves: each hand or foot move, or short sequence, that matters. Usually 5 to 12 moves.
- Timestamp each move with t in seconds, taken from the frame timestamps, between 0 and ${duration.toFixed(1)}. Keep moves in time order.
- Rate each move and explain why in one to three short sentences.
- Be specific about technique: hips close to the wall, straight arms, footwork (precise placements, quiet feet, smearing, re-adjusting feet), hesitation and over-gripping, flagging, heel and toe hooks, drop knees, dynamic versus static choices, and efficiency (wasted movement, wasted energy, chalking up or shaking out at the right moment).

Ratings, like a chess engine:
- brilliant: a non-obvious, excellent choice most climbers would miss.
- great: clearly the optimal way to do the move.
- good: fine, nothing lost.
- inaccuracy: a small inefficiency.
- mistake: a costly error that burned energy or made the next move harder.
- blunder: the move that caused the fall or a near-fall.

Fields:
- better: null for brilliant, great and good. For inaccuracy, mistake and blunder, a concrete alternative: body position, which limb, where, how.
- send_chance: 0-100, the probability of topping out from that point in the climb. It should rise and fall with the climb like a chess evaluation bar.
- accuracy: overall execution quality 0-100, like chess accuracy. A clean, efficient send is 85+. A scrappy send is 60-80. A fall caused by poor technique is usually below 70.
- sent: true only if they clearly top out, with both hands controlled on the finish hold. If they come off, or you cannot see them finish, sent is false.
- crux: if sent is false, the move where it fell apart: t, what_went_wrong and try_this, specific and actionable. If sent is true, crux is null.
- summary: three to five short sentences on the climb as a whole: what went well, where energy leaked, and the one thing to fix first.

If the frames do not show a person climbing, still return valid JSON: sent false, accuracy below 20, crux null, an empty moves list, and a summary that says what you could see instead and how to film a climb (whole problem in frame, phone steady, start just before pulling on).

Style: second person ("you"), plain British English, short punchy sentences, no emoji, no jargon without a reason. Talk about their body and their movement, not about chess.`;
}

function buildParts(frames: readonly Frame[], duration: number): Part[] {
  const parts: Part[] = [{ text: buildPrompt(frames.length, duration) }];
  frames.forEach((f, i) => {
    parts.push({ text: `Frame ${i + 1} at t=${f.t.toFixed(1)}s` });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: f.data } });
  });
  return parts;
}

// ---------------------------------------------------------------------------
// Normalisation

const GOOD_OR_BETTER: ReadonlySet<MoveRating> = new Set(["brilliant", "great", "good"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The model answered, but not with anything we can show. */
export class UnusableReviewError extends Error {
  name = "UnusableReviewError";
}

function toRating(v: unknown): MoveRating {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return (RATINGS as readonly string[]).includes(s) ? (s as MoveRating) : "good";
}

/**
 * Coerces whatever the model returned into a valid Review: clamps numbers,
 * keeps times inside the video, sorts moves, and fixes inconsistent fields.
 * Throws when there is nothing usable.
 */
export function normalizeReview(raw: unknown, duration: number): Review {
  if (!isRecord(raw)) throw new UnusableReviewError("review is not an object");
  const maxT = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const clampT = (t: number) => round1(clamp(t, 0, maxT));

  const rawMoves = Array.isArray(raw.moves) ? raw.moves : [];
  const moves: Move[] = [];
  let lastChance = 50;
  for (const m of rawMoves) {
    if (!isRecord(m)) continue;
    const move = toText(m.move);
    const t = toNumber(m.t);
    if (!move || t === null) continue;
    const rating = toRating(m.rating);
    const chance = toNumber(m.send_chance);
    lastChance = chance === null ? lastChance : Math.round(clamp(chance, 0, 100));
    const better = toText(m.better);
    moves.push({
      t: clampT(t),
      move,
      rating,
      why: toText(m.why),
      better: GOOD_OR_BETTER.has(rating) || !better || better.toLowerCase() === "null" ? null : better,
      send_chance: lastChance,
    });
    if (moves.length >= MAX_MOVES) break;
  }
  moves.sort((a, b) => a.t - b.t);

  const summary = toText(raw.summary);
  if (!summary && moves.length === 0) throw new UnusableReviewError("review has no summary and no moves");

  const sent = raw.sent === true || raw.sent === "true";
  const accuracyRaw = toNumber(raw.accuracy);
  const accuracy = round1(clamp(accuracyRaw ?? 50, 0, 100));

  // No moves means the coach couldn't see a climb, so there is no crux to point at.
  let crux: Crux | null = null;
  if (!sent && moves.length > 0 && isRecord(raw.crux)) {
    const t = toNumber(raw.crux.t);
    const what = toText(raw.crux.what_went_wrong);
    const tryThis = toText(raw.crux.try_this);
    if (t !== null && what && tryThis) crux = { t: clampT(t), what_went_wrong: what, try_this: tryThis };
  }

  return {
    sent,
    accuracy,
    summary: summary || (sent ? "You topped it. Here is how each move went." : "Here is how each move went."),
    crux,
    moves,
  };
}

// ---------------------------------------------------------------------------
// Calling Gemini

export type ReviewFailure = "no_key" | "busy" | "error";

export class ReviewError extends Error {
  constructor(
    readonly reason: ReviewFailure,
    message: string,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/** Busy, rate-limited, timed out, model unavailable or unusable answer: worth trying another model. */
function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return [404, 408, 429, 500, 502, 503, 504].includes(err.status);
  // The model produced empty or unparseable JSON: a different model may do better.
  if (err instanceof SyntaxError || err instanceof UnusableReviewError) return true;
  if (err instanceof Error) {
    return (
      err.name === "AbortError" ||
      err.name === "TimeoutError" ||
      /timed? ?out|aborted|fetch failed|ECONNRESET|socket hang up/i.test(err.message)
    );
  }
  return false;
}

/** The model said "busy" quickly: worth asking the same model again after a pause. */
function isOverloaded(err: unknown): boolean {
  // Not 429: that is usually a spent quota, which a few seconds' wait won't fix.
  return err instanceof ApiError && [500, 502, 503].includes(err.status);
}

function isBusy(err: unknown): boolean {
  if (err instanceof ApiError) return [408, 429, 500, 502, 503, 504].includes(err.status);
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError" || /timed? ?out|aborted/i.test(err.message));
}

/** Short, non-secret description for server logs. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return `ApiError ${err.status}: ${err.message.slice(0, 200)}`;
  if (err instanceof Error) return `${err.name}: ${err.message.slice(0, 200)}`;
  return String(err).slice(0, 200);
}

export interface ReviewResult {
  review: Review;
  model: string;
  ms: number;
}

function modelList(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const extra = (process.env.GEMINI_BACKUP_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...(extra.length ? extra : BACKUP_MODELS)])];
}

/**
 * Reviews a climb from its frames, within one overall deadline.
 *
 * The Flash models are often "high demand" (fast 503s) or stall for 30s+, so:
 * GEMINI_MODEL goes first; a busy, rate-limited, unavailable or unparseable
 * answer moves straight on to the next backup model; if an attempt is still
 * pending after HEDGE_AFTER_MS a backup starts alongside it; and models that
 * said "busy" are asked again after a short backoff while time allows. The
 * first usable review wins and the rest are cancelled.
 */
export function reviewClimb(
  frames: readonly Frame[],
  duration: number,
  opts: { deadline?: number; signal?: AbortSignal } = {},
): Promise<ReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Promise.reject(new ReviewError("no_key", "GEMINI_API_KEY is not set"));

  const deadline = opts.deadline ?? Date.now() + REVIEW_DEADLINE_MS;
  const models = modelList();
  const ai = new GoogleGenAI({ apiKey });
  const contents = [{ role: "user", parts: buildParts(frames, duration) }];

  // Cancels every in-flight attempt once we have an answer or the caller goes away.
  const cancel = new AbortController();
  const signal = opts.signal ? AbortSignal.any([cancel.signal, opts.signal]) : cancel.signal;

  async function attempt(model: string, timeout: number): Promise<ReviewResult> {
    const t0 = Date.now();
    const res = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: REVIEW_SCHEMA,
        temperature: 0.4,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        httpOptions: { timeout },
        abortSignal: signal,
      },
    });
    const text = res.text;
    if (!text) throw new SyntaxError(`empty response (finish: ${res.candidates?.[0]?.finishReason ?? "unknown"})`);
    return { review: normalizeReview(JSON.parse(text), duration), model, ms: Date.now() - t0 };
  }

  return new Promise<ReviewResult>((resolve, reject) => {
    // Untried models first (in priority order), then busy ones again after a short backoff.
    const queue = models.map((model) => ({ model, notBefore: 0, fails: 0 }));
    let running = 0;
    let attempts = 0;
    let firstLaunch = 0;
    let settled = false;
    let stop = false;
    let sawBusy = false;
    let lastErr: unknown = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cancel.abort();
      fn();
    };
    const fail = () =>
      settle(() => {
        const reason: ReviewFailure = sawBusy || lastErr === null ? "busy" : "error";
        reject(new ReviewError(reason, lastErr === null ? "no time left to ask a model" : describeError(lastErr)));
      });

    const start = (item: (typeof queue)[number], timeout: number) => {
      attempts++;
      running++;
      const t0 = Date.now();
      attempt(item.model, timeout).then(
        (result) => settle(() => resolve(result)),
        (err) => {
          running--;
          if (settled) return;
          lastErr = err;
          if (isBusy(err)) sawBusy = true;
          console.warn(`[review] ${item.model} failed after ${Date.now() - t0}ms: ${describeError(err)}`);
          if (!isRetryable(err)) stop = true;
          else if (isOverloaded(err)) {
            item.fails++;
            item.notBefore = Date.now() + RETRY_BACKOFF_MS * item.fails;
            queue.push(item);
          }
          pump();
        },
      );
    };

    /** Starts the next attempt now, or sets a timer for when it may start. */
    const pump = () => {
      if (settled) return;
      clearTimeout(timer);
      const now = Date.now();
      const open = !stop && attempts < MAX_ATTEMPTS && !opts.signal?.aborted && queue.length > 0;
      // One attempt at a time to begin with; every HEDGE_AFTER_MS without an
      // answer allows one more to run alongside the slow ones.
      if (firstLaunch === 0) firstLaunch = now;
      const startAt = open
        ? Math.max(firstLaunch + running * HEDGE_AFTER_MS, Math.min(...queue.map((q) => q.notBefore)))
        : Number.POSITIVE_INFINITY;
      if (deadline - startAt < MIN_ATTEMPT_MS) {
        if (running === 0) fail();
        return;
      }
      if (startAt > now) {
        timer = setTimeout(pump, startAt - now);
        return;
      }
      const idx = queue.findIndex((q) => q.notBefore <= now);
      const [item] = queue.splice(idx, 1);
      start(item, deadline - now);
      pump();
    };

    pump();
  });
}
