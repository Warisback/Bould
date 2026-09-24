"use client";

import { useSyncExternalStore } from "react";
import { getLastReview, subscribeLastReview, type CachedReview } from "./storage";

const getServerSnapshot = () => undefined;

/**
 * The cached last review, read from localStorage without hydration mismatches.
 * `undefined` = not read yet (server render / hydration), `null` = nothing cached.
 */
export function useLastReview(): CachedReview | null | undefined {
  return useSyncExternalStore(subscribeLastReview, getLastReview, getServerSnapshot);
}
