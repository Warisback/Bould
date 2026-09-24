import { describeError, ReviewError, reviewClimb, REVIEW_DEADLINE_MS } from "@/lib/gemini";
import type { Frame, Review } from "@/lib/types";
import sample from "@/public/sample.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FRAMES = 16;
/** Base64 characters across all frames. Vercel caps request bodies at 4.5MB. */
const MAX_TOTAL_B64 = 4_400_000;
const MAX_FRAME_B64 = 1_500_000;
const MIN_FRAME_B64 = 100;
const MAX_DURATION_S = 15 * 60;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

type FallbackReason = "no_key" | "bad_input" | "busy" | "error";

class BadInput extends Error {
  name = "BadInput";
}

function fallback(reason: FallbackReason) {
  const body: Review = { ...(sample as Review), fallback: true, fallback_reason: reason };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

function parseInput(body: unknown): { frames: Frame[]; duration: number } {
  if (typeof body !== "object" || body === null) throw new BadInput("body is not an object");
  const { frames, duration } = body as { frames?: unknown; duration?: unknown };

  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_S) {
    throw new BadInput("duration must be a positive number of seconds");
  }
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > MAX_FRAMES) {
    throw new BadInput(`frames must be an array of 1-${MAX_FRAMES}`);
  }

  let total = 0;
  const out: Frame[] = frames.map((f, i) => {
    const { t, data } = (f ?? {}) as { t?: unknown; data?: unknown };
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) throw new BadInput(`frame ${i}: bad t`);
    if (typeof data !== "string" || data.length < MIN_FRAME_B64 || data.length > MAX_FRAME_B64) {
      throw new BadInput(`frame ${i}: bad data size`);
    }
    if (!BASE64.test(data)) throw new BadInput(`frame ${i}: data is not base64`);
    total += data.length;
    return { t: Math.min(t, duration), data };
  });
  if (total > MAX_TOTAL_B64) throw new BadInput(`frames too large (${total} chars)`);

  out.sort((a, b) => a.t - b.t);
  return { frames: out, duration };
}

/**
 * POST { frames: Frame[], duration } -> Review.
 * Never fails: on any problem it returns the sample review with
 * `fallback: true` and a short `fallback_reason`, so the phone always has something to show.
 */
export async function POST(request: Request) {
  const started = Date.now();

  let input: { frames: Frame[]; duration: number };
  try {
    input = parseInput(await request.json());
  } catch (err) {
    console.warn(`[review] bad input: ${describeError(err)}`);
    return fallback("bad_input");
  }

  try {
    const { review, model, ms } = await reviewClimb(input.frames, input.duration, {
      deadline: started + REVIEW_DEADLINE_MS,
      signal: request.signal,
    });
    console.info(
      `[review] ok via ${model} in ${ms}ms (total ${Date.now() - started}ms, ${input.frames.length} frames, ${review.moves.length} moves)`,
    );
    return Response.json(review, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const reason: FallbackReason = err instanceof ReviewError ? err.reason : "error";
    console.error(`[review] falling back to sample (${reason}) after ${Date.now() - started}ms: ${describeError(err)}`);
    return fallback(reason);
  }
}
