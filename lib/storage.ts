"use client";

import { normalizeReview } from "./review";
import type { Review } from "./types";

const USER_KEY = "br:user_id";
const LAST_REVIEW_KEY = "br:last_review";

export interface CachedReview {
  review: Review;
  /** "sample" or "upload" */
  source: "sample" | "upload";
  saved_climb_id?: string;
  created_at: number;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota: ignore
  }
}

export function getUserId(): string | null {
  return safeGet(USER_KEY);
}

export function setUserId(id: string | null) {
  safeSet(USER_KEY, id);
}

const LAST_REVIEW_EVENT = "br:last-review";

// Memoised by the raw string so repeated reads return the same object
// (required for useSyncExternalStore snapshots).
let lastRaw: string | null | undefined;
let lastParsed: CachedReview | null = null;

export function getLastReview(): CachedReview | null {
  const raw = safeGet(LAST_REVIEW_KEY);
  if (raw === lastRaw) return lastParsed;
  lastRaw = raw;
  lastParsed = null;
  if (raw) {
    try {
      lastParsed = parseCached(JSON.parse(raw));
    } catch {
      lastParsed = null;
    }
  }
  return lastParsed;
}

/** Validates a cached value so bad data from an older build can never reach render. */
function parseCached(raw: unknown): CachedReview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const review = normalizeReview(c.review);
  if (!review) return null;
  const cached: CachedReview = {
    review,
    source: c.source === "sample" ? "sample" : "upload",
    created_at: typeof c.created_at === "number" && Number.isFinite(c.created_at) ? c.created_at : Date.now(),
  };
  if (typeof c.saved_climb_id === "string") cached.saved_climb_id = c.saved_climb_id;
  return cached;
}

/** A cached review that is really the canned sample: picked by the climber, or returned after an upload error. */
export function isSampleReview(cached: CachedReview): boolean {
  return cached.source === "sample" || cached.review.fallback === true;
}

export function setLastReview(value: CachedReview | null) {
  safeSet(LAST_REVIEW_KEY, value ? JSON.stringify(value) : null);
  try {
    window.dispatchEvent(new Event(LAST_REVIEW_EVENT));
  } catch {
    // no window (should not happen in a client effect)
  }
}

/** Notifies on changes from this tab (setLastReview) and other tabs (storage event). */
export function subscribeLastReview(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === LAST_REVIEW_KEY) onChange();
  };
  window.addEventListener(LAST_REVIEW_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LAST_REVIEW_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
