"use client";

import Link from "next/link";
import { useLastReview } from "@/lib/useLastReview";
import PageHeader from "./PageHeader";
import ReviewScreen from "./ReviewScreen";

export default function LastReviewView() {
  const last = useLastReview();

  if (last === undefined) {
    // Server render / hydration: localStorage not read yet.
    return (
      <div className="px-4" aria-busy>
        <PageHeader title="Climb review" />
        <div className="mt-4 flex gap-2">
          <div className="w-3 rounded-full bg-surface" />
          <div className="aspect-[3/4] max-h-[55svh] flex-1 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (!last || !Array.isArray(last.review?.moves)) {
    return (
      <div className="px-4">
        <PageHeader title="Last review" />
        <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 20 9 9l4 6 3-4 4 9H4Z" />
              <circle cx="16" cy="6" r="2" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold">No review yet</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Your most recent climb review lives here on this phone. Review a climb, or try the sample to see how it works.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/review" className="flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]">
              Review my climb
            </Link>
            <Link href="/review/sample" className="flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98]">
              Try a sample climb
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const when = new Date(last.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <ReviewScreen
      review={last.review}
      banner={
        <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
          {last.source === "sample" ? (
            <>
              <span className="font-semibold text-ink">Sample climb</span> — no video needed.
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">Your climb from {when}.</span> Videos stay on your phone only
              while you review them, so this is a virtual replay.
            </>
          )}
        </div>
      }
    />
  );
}
