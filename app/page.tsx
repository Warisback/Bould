import Link from "next/link";
import LastReviewCard from "@/components/home/LastReviewCard";
import RatingBadge from "@/components/review/RatingBadge";
import { RATINGS } from "@/lib/types";

const STEPS = [
  { title: "Film your attempt", body: "Prop your phone against your bag and climb. One attempt, up to 30 seconds." },
  { title: "Get every move rated", body: "Brilliant to blunder, with a send-chance bar that moves like a chess eval." },
  { title: "Climb the leaderboard", body: "Flash and project ratings for your gym, earned one boulder at a time." },
];

export default function Home() {
  return (
    <div className="px-4 pt-10">
      <p className="text-sm font-extrabold tracking-[0.22em] text-brand">BETA REVIEW</p>

      <h1 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-tight">
        Your climb, reviewed like a chess game.
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-muted">
        Every move rated, the crux found, and exactly what to try on your next attempt.
      </p>

      <div className="mt-6 flex items-center gap-1.5" aria-hidden>
        {RATINGS.map((r) => (
          <RatingBadge key={r} rating={r} size="md" />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <Link
          href="/review"
          className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)] transition active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="6" width="13" height="12" rx="2.5" />
            <path d="m16 10.5 5-3v9l-5-3" />
          </svg>
          Review my climb
        </Link>
        <Link
          href="/review/sample"
          className="flex h-14 items-center justify-center rounded-full border-2 border-brand text-[17px] font-bold text-brand transition active:scale-[0.98] active:bg-brand/10"
        >
          Try a sample climb
        </Link>
      </div>

      <div className="mt-8">
        <LastReviewCard />
      </div>

      <section className="mt-8 rounded-3xl bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">How it works</h2>
        <ol className="mt-4 space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-brand">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
