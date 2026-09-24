"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { ChevronRightIcon, MountainIcon, PinIcon } from "@/components/icons";
import { formatAccuracy } from "@/components/review/format";
import { ApiError, apiFetch, errorMessage, type UserProfileResponse } from "@/lib/api";
import { formatThousands } from "@/lib/format";
import { TAB_META } from "@/lib/leaderboard";
import type { LeaderboardTab } from "@/lib/types";
import { changeUserId, useUserId } from "@/lib/useUserId";
import ClimbRow from "./ClimbRow";

type State =
  | { status: "loading" }
  | { status: "ready"; data: UserProfileResponse }
  | { status: "missing" }
  | { status: "error"; message: string };

function Stat({
  label,
  value,
  unit,
  sub,
  big = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-surface p-4 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1.5 font-bold leading-none tabular-nums tracking-tight ${big ? "text-[40px]" : "text-[28px]"}`}>
        {value}
        {unit && <span className="ml-0.5 text-base font-semibold text-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-2 text-xs text-faint">{sub}</p>}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-8">{children}</div>;
}

export default function ProfileView() {
  const router = useRouter();
  const userId = useUserId();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const data = await apiFetch<UserProfileResponse>(`/api/users/${encodeURIComponent(userId)}`, {
          signal: ctrl.signal,
        });
        setState({ status: "ready", data });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "missing" });
        else setState({ status: "error", message: errorMessage(err) });
      }
    };
    void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ctrl.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, reload]);

  const switchClimber = () => {
    changeUserId(null);
    router.push("/join?next=%2Fprofile");
  };

  if (userId === null) {
    return (
      <Shell>
        <h1 className="text-[28px] font-extrabold tracking-tight">Profile</h1>
        <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-deep text-brand">
            <MountainIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Your climbing profile</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Join Aldgate to track your flash and project ratings, your points and every climb you review.
          </p>
          <Link
            href="/join?next=%2Fprofile"
            className="mt-6 flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]"
          >
            Join your gym
          </Link>
        </div>
      </Shell>
    );
  }

  if (userId === undefined || state.status === "loading") {
    return (
      <Shell>
        <div className="flex items-center gap-4" aria-busy aria-label="Loading profile">
          <div className="h-20 w-20 animate-pulse rounded-full bg-surface" />
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-surface" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="col-span-2 h-[120px] animate-pulse rounded-3xl bg-surface" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      </Shell>
    );
  }

  if (state.status === "missing") {
    return (
      <Shell>
        <h1 className="text-[28px] font-extrabold tracking-tight">Profile</h1>
        <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
          <h2 className="text-xl font-bold">We couldn&apos;t find your climber</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            This phone remembers a climber that isn&apos;t on the Aldgate board any more. Join again to start fresh.
          </p>
          <button
            type="button"
            onClick={switchClimber}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]"
          >
            Join again
          </button>
        </div>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <h1 className="text-[28px] font-extrabold tracking-tight">Profile</h1>
        <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
          <h2 className="text-xl font-bold">Can&apos;t load your profile</h2>
          <p className="mt-2 text-[15px] text-muted">{state.message}</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full border-2 border-brand px-6 font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  const { user, climbs, ranks, week_climbs } = state.data;
  const sendRate = user.climbs > 0 ? Math.round((user.sends / user.climbs) * 100) : 0;
  const joined = new Date(user.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const chips: { tab: LeaderboardTab; rank: number | null }[] = [
    { tab: "points", rank: ranks.points },
    { tab: "flash", rank: ranks.flash },
    { tab: "project", rank: ranks.project },
    { tab: "week", rank: ranks.week },
  ];
  const lastPoints = climbs[0]?.points_earned;

  return (
    <Shell>
      <header className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" highlight />
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight">{user.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <PinIcon className="h-4 w-4 text-brand" />
            Aldgate · London
          </p>
          <p className="mt-0.5 text-xs text-faint">Climbing since {joined}</p>
        </div>
      </header>

      <nav className="mt-5 grid grid-cols-4 gap-2" aria-label="Gym ranks">
        {chips.map(({ tab, rank }) => (
          <Link
            key={tab}
            href={tab === "points" ? "/gym/aldgate" : `/gym/aldgate?tab=${tab}`}
            className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-line bg-surface px-1 py-2 transition active:bg-surface-2"
          >
            <span className={`text-lg font-bold leading-none tabular-nums ${rank ? "text-ink" : "text-faint"}`}>
              {rank ? `#${rank}` : "–"}
            </span>
            <span className="mt-1 text-[11px] text-muted">{TAB_META[tab].label}</span>
          </Link>
        ))}
      </nav>

      <section className="mt-5 grid grid-cols-2 gap-3" aria-label="Stats">
        <div className="col-span-2 rounded-3xl bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Points</p>
            {ranks.points && (
              <span className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-bold text-brand">
                #{ranks.points} at Aldgate
              </span>
            )}
          </div>
          <p className="mt-1 text-[52px] font-extrabold leading-none tabular-nums tracking-tight">
            {formatThousands(user.points)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {lastPoints ? (
              <>
                <span className="font-semibold text-good">+{lastPoints}</span> from your last climb. Every climb you log adds
                more.
              </>
            ) : (
              "Every climb you log adds points. Harder grades and sends add more."
            )}
          </p>
        </div>

        <Stat label="Flash rating" value={user.flash_rating} big />
        <Stat label="Project rating" value={user.project_rating} big />
        <Stat label="Climbs" value={user.climbs} sub="logged at Aldgate" />
        <Stat label="Sends" value={user.sends} sub={user.climbs > 0 ? `${sendRate}% of climbs` : "no climbs yet"} />
        <Stat
          label="Avg accuracy"
          value={user.climbs > 0 ? formatAccuracy(user.avg_accuracy) : "–"}
          unit={user.climbs > 0 ? "%" : undefined}
          sub="across your reviews"
        />
        <Stat
          label="This week"
          value={week_climbs}
          sub={ranks.week ? `#${ranks.week} this week` : week_climbs === 1 ? "climb" : "climbs"}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Your climbs</h2>
          {climbs.length > 0 && <span className="text-sm tabular-nums text-muted">{user.climbs}</span>}
        </div>

        {climbs.length === 0 ? (
          <div className="mt-3 rounded-3xl bg-surface p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
              <MountainIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold">No climbs yet</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Film an attempt, get every move reviewed, then save it here. That starts your rating and your points.
            </p>
            <div className="mt-5 space-y-3">
              <Link
                href="/review"
                className="flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]"
              >
                Review my climb
              </Link>
              <Link
                href="/review/sample"
                className="flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
              >
                Try the sample climb
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {climbs.map((c) => (
              <li key={c.id}>
                <ClimbRow climb={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex flex-col items-center gap-1">
        <Link
          href="/why"
          className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-muted transition active:bg-surface"
        >
          Why this matters
          <ChevronRightIcon />
        </Link>
        <button
          type="button"
          onClick={switchClimber}
          className="inline-flex h-11 items-center rounded-full px-4 text-sm text-faint transition active:bg-surface"
        >
          Not you? <span className="ml-1 font-semibold text-muted">Switch climber</span>
        </button>
      </div>
    </Shell>
  );
}
