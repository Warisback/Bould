"use client";

import { useEffect } from "react";
import { getLastReview, isSampleReview, setLastReview, type CachedReview } from "@/lib/storage";
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
    // A cached upload that fell back to the sample isn't real, so it may be replaced.
    const cached = getLastReview();
    if (source === "sample" && cached && !isSampleReview(cached)) return;
    setLastReview({ review, source, created_at: Date.now() });
  }, [review, source]);
  return null;
}
