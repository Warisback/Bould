"use client";

import { useEffect } from "react";
import { getLastReview, setLastReview, type CachedReview } from "@/lib/storage";
import type { Review } from "@/lib/types";

/** Caches a review as the "last review" so the home page can reopen it. Renders nothing. */
export default function RememberReview({
  review,
  source,
}: {
  review: Review;
  source: CachedReview["source"];
}) {
  useEffect(() => {
    // Never let the sample overwrite a real review the climber hasn't looked at again.
    if (source === "sample" && getLastReview()?.source === "upload") return;
    setLastReview({ review, source, created_at: Date.now() });
  }, [review, source]);
  return null;
}
