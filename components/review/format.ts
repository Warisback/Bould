import type { Move } from "@/lib/types";

/** m:ss, floored to the second. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "63.8" for decimals, "64" for whole numbers. */
export function formatAccuracy(accuracy: number): string {
  const clamped = Math.min(100, Math.max(0, accuracy));
  return Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1);
}

/** Tolerance so a seek that lands a frame early still counts as "at" the move. */
const MOVE_EPSILON = 0.05;

/** Index of the last move with t <= time, or -1 before the first move. Moves must be sorted by t. */
export function moveIndexAt(moves: readonly Move[], time: number): number {
  let idx = -1;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].t <= time + MOVE_EPSILON) idx = i;
    else break;
  }
  return idx;
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}
