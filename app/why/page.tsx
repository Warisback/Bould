import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import PageHeader from "@/components/review/PageHeader";
import { formatThousands } from "@/lib/format";
import { getGymStats, type GymStats } from "@/lib/redis";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Why this matters · Beta Review",
};

// TODO: fill in real coaching or membership price
const PRICE_PLACEHOLDER = "£[price] / month";
// TODO: replace with the real call to action (contact link, booking page…)
const CTA_PLACEHOLDER = "[CTA] Bring Beta Review to your gym";

const REASONS = [
  {
    title: "A reason to come back",
    body: "Every review ends with the crux and exactly what to try next time. Members come back to try it.",
  },
  {
    title: "Rivalry on the wall",
    body: "Flash, project and points boards update live. A name just above yours is a reason to book another session.",
  },
  {
    title: "Engagement the gym can see",
    body: "Every saved climb is logged: who is climbing, how often and at what grades, week by week.",
  },
];

async function loadStats(): Promise<GymStats | null> {
  try {
    await ensureSeed("aldgate");
    return await getGymStats("aldgate");
  } catch {
    return null;
  }
}

function LiveStat({ value, label }: { value: number | null; label: string }) {
  return (
    <div>
      <p className="text-[32px] font-extrabold leading-none tabular-nums tracking-tight">
        {value === null ? "–" : formatThousands(value)}
      </p>
      <p className="mt-2 text-xs leading-snug text-muted">{label}</p>
    </div>
  );
}

export default async function WhyPage() {
  const stats = await loadStats();

  return (
    <div className="px-4 pb-4">
      <PageHeader title="Why this matters" backHref="/gym/aldgate" />

      <p className="mt-4 text-sm font-extrabold tracking-[0.22em] text-brand">FOR GYMS</p>
      <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight">
        Gyms keep members when members compete.
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-muted">
        Beta Review gives every session two things to come back for: an honest review of how you climbed, and a live board
        to climb.
      </p>

      <section className="mt-8 rounded-3xl bg-surface p-5" aria-label="Live numbers">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Right now at Aldgate</p>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <span className="h-2 w-2 animate-live-pulse rounded-full bg-brand" />
            Live
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <LiveStat value={stats?.members ?? null} label="climbers on the board" />
          <LiveStat value={stats?.climbs_this_week ?? null} label="climbs logged this week" />
          <LiveStat value={stats?.active_this_week ?? null} label="climbed this week" />
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5">
        <ol className="space-y-5">
          {REASONS.map((r, i) => (
            <li key={r.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-brand">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-3xl border-2 border-dashed border-line p-5" aria-label="Pricing placeholder">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">Beta Review for gyms</p>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Placeholder
          </span>
        </div>
        <p className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight">{PRICE_PLACEHOLDER}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>Move-by-move reviews for every member</li>
          <li>A live leaderboard for your gym</li>
          <li>Weekly numbers on who is climbing</li>
        </ul>
        <button
          type="button"
          disabled
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full border-2 border-dashed border-brand/60 text-[15px] font-semibold text-brand/80"
        >
          {CTA_PLACEHOLDER}
        </button>
      </section>

      <div className="mt-6 flex justify-center">
        <Link
          href="/gym/aldgate"
          className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold text-brand transition active:bg-surface"
        >
          See the live board
          <ChevronRightIcon />
        </Link>
      </div>
    </div>
  );
}
