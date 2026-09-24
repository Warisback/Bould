"use client";

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

export function getLastReview(): CachedReview | null {
  const raw = safeGet(LAST_REVIEW_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedReview;
  } catch {
    return null;
  }
}

export function setLastReview(value: CachedReview | null) {
  safeSet(LAST_REVIEW_KEY, value ? JSON.stringify(value) : null);
}
