import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/review/PageHeader";

export const metadata: Metadata = {
  title: "Review my climb · Beta Review",
};

export default function ReviewUploadPage() {
  return (
    <div className="px-4">
      <PageHeader title="Review my climb" />
      <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-deep text-brand">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="6" width="13" height="12" rx="2.5" />
            <path d="m16 10.5 5-3v9l-5-3" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold">Upload is coming next</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Soon you&apos;ll film an attempt on your phone and get every move rated. Until then, the sample climb shows the
          full review.
        </p>
        <Link
          href="/review/sample"
          className="mt-6 flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98]"
        >
          Try a sample climb
        </Link>
      </div>
    </div>
  );
}
