import type { Metadata } from "next";
import ReviewScreen from "@/components/review/ReviewScreen";
import RememberReview from "@/components/review/RememberReview";
import type { Review } from "@/lib/types";
import sample from "@/public/sample.json";

export const metadata: Metadata = {
  title: "Sample climb · Beta Review",
};

const review = sample as Review;

export default function SampleReviewPage() {
  return (
    <>
      <RememberReview review={review} source="sample" />
      <ReviewScreen
        review={review}
        banner={
          <div className="flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            <span>
              <span className="font-semibold text-ink">Sample climb</span> — no video needed. A V4 fall at Aldgate.
            </span>
          </div>
        }
      />
    </>
  );
}
