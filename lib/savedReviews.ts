"use client";

import { getLastReview, setLastReview } from "./storage";
import type { Review } from "./types";

/**
 * Remembers which reviews this phone has already saved to a profile, so the
 * same review can't be saved twice. Keyed by a hash of the review JSON.
 */
const KEY = "br:saved_reviews";
const EVENT = "br:saved-reviews";
const MAX_ENTRIES = 50;

export interface SavedReview {
  climb_id: string;
  user_id: string;
  saved_at: number;
}

type SavedMap = Record<string, SavedReview>;

/** FNV-1a over the review JSON: stable for the same review object from the same source. */
export function reviewKey(review: Review): string {
  const s = JSON.stringify(review);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}-${s.length.toString(36)}`;
}

/** Raw stored string: a stable snapshot for useSyncExternalStore. */
export function getSavedRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribeSaved(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function parseMap(raw: string | null): SavedMap {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as SavedMap) : {};
  } catch {
    return {};
  }
}

function readMap(): SavedMap {
  return parseMap(getSavedRaw());
}

/** The saved entry for this review and climber, from a raw snapshot (see getSavedRaw). */
export function findSaved(raw: string | null, review: Review, userId: string): SavedReview | null {
  const entry = parseMap(raw)[reviewKey(review)];
  return entry && entry.user_id === userId && typeof entry.climb_id === "string" ? entry : null;
}

export function markReviewSaved(review: Review, entry: SavedReview) {
  const key = reviewKey(review);
  const map = readMap();
  map[key] = entry;
  const trimmed = Object.fromEntries(
    Object.entries(map)
      .sort((a, b) => b[1].saved_at - a[1].saved_at)
      .slice(0, MAX_ENTRIES),
  );
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // private mode / quota: the in-memory saved state still prevents a double save
  }
  window.dispatchEvent(new Event(EVENT));

  // Also stamp the cached "last review" when it's this same review.
  const last = getLastReview();
  if (last && reviewKey(last.review) === key && last.saved_climb_id !== entry.climb_id) {
    setLastReview({ ...last, saved_climb_id: entry.climb_id });
  }
}
