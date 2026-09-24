"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { ChevronRightIcon, PinIcon } from "@/components/icons";
import { ApiError, apiFetch, errorMessage } from "@/lib/api";
import { formatValue, LEADERBOARD_TABS, rowSubtitle, TAB_META } from "@/lib/leaderboard";
import type { GymId, LeaderboardResponse, LeaderboardRow, LeaderboardTab } from "@/lib/types";
import { useUserId } from "@/lib/useUserId";

const POLL_MS = 5000;
const CHANGE_MS = 3200;
const FLIP_MS = 650;

type Direction = "up" | "down" | null;
interface RowChange {
  dir: Direction;
  valueChanged: boolean;
}

function isAbort(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

export default function Leaderboard({ gym, initialTab }: { gym: GymId; initialTab: LeaderboardTab }) {
  const userId = useUserId();
  const [tab, setTab] = useState<LeaderboardTab>(initialTab);
  const [boards, setBoards] = useState<Partial<Record<LeaderboardTab, LeaderboardResponse>>>({});
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [changes, setChanges] = useState<Record<string, RowChange>>({});
  const [retry, setRetry] = useState(0);

  // Last seen ranks/values, to spot movement between polls of the same tab.
  const lastSeen = useRef<{ tab: LeaderboardTab; rows: Map<string, { rank: number; value: number }> } | null>(null);
  const clearTimer = useRef<number | undefined>(undefined);

  const apply = useCallback((res: LeaderboardResponse) => {
    const all = res.me ? [...res.rows, res.me] : res.rows;
    const now = new Map(all.map((r) => [r.id, { rank: r.rank, value: r.value }]));
    const prev = lastSeen.current;
    if (prev && prev.tab === res.tab) {
      const found: Record<string, RowChange> = {};
      for (const [id, cur] of now) {
        const before = prev.rows.get(id);
        // Someone new breaking into the top 20 counts as moving up.
        if (!before) {
          if (prev.rows.size > 0) found[id] = { dir: "up", valueChanged: true };
          continue;
        }
        const dir: Direction = cur.rank < before.rank ? "up" : cur.rank > before.rank ? "down" : null;
        const valueChanged = cur.value !== before.value;
        if (dir || valueChanged) found[id] = { dir, valueChanged };
      }
      if (Object.keys(found).length > 0) {
        setChanges(found);
        window.clearTimeout(clearTimer.current);
        clearTimer.current = window.setTimeout(() => setChanges({}), CHANGE_MS);
      }
    }
    lastSeen.current = { tab: res.tab, rows: now };
    setBoards((b) => ({ ...b, [res.tab]: res }));
  }, []);

  // Poll every 5s while visible; refetch immediately on tab change and when the page comes back.
  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    let ctrl: AbortController | null = null;
    const url = `/api/leaderboard?gym=${gym}&tab=${tab}${userId ? `&me=${encodeURIComponent(userId)}` : ""}`;

    const load = async () => {
      if (document.hidden) return;
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const res = await apiFetch<LeaderboardResponse>(url, { signal: ctrl.signal });
        if (cancelled) return;
        apply(res);
        setError(null);
      } catch (err) {
        if (cancelled || isAbort(err)) return;
        setError(err instanceof Error ? err : new Error("failed"));
      }
    };

    void load();
    const timer = window.setInterval(load, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      ctrl?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gym, tab, userId, retry, apply]);

  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  const selectTab = (t: LeaderboardTab) => {
    if (t === tab) return;
    setTab(t);
    setChanges({});
    try {
      window.history.replaceState(null, "", t === "points" ? window.location.pathname : `?tab=${t}`);
    } catch {
      // ignore
    }
  };

  const board = boards[tab];
  const rows = useMemo(() => board?.rows ?? [], [board]);
  const meInRows = Boolean(userId) && rows.some((r) => r.id === userId);

  // FLIP: animate rows from where they were to where they are now.
  const rowEls = useRef(new Map<string, HTMLLIElement>());
  const lastTops = useRef<{ tab: LeaderboardTab; tops: Map<string, number> } | null>(null);
  useLayoutEffect(() => {
    const tops = new Map<string, number>();
    rowEls.current.forEach((el, id) => tops.set(id, el.offsetTop));
    const last = lastTops.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (last && last.tab === tab && !reduce) {
      tops.forEach((top, id) => {
        const before = last.tops.get(id);
        const el = rowEls.current.get(id);
        if (before === undefined || before === top || !el) return;
        el.style.transition = "none";
        el.style.transform = `translateY(${before - top}px)`;
        // Climbers moving up pass over the ones they overtake.
        el.style.zIndex = before > top ? "2" : "1";
        el.getBoundingClientRect(); // commit the start position
        requestAnimationFrame(() => {
          el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
          el.style.transform = "";
          window.setTimeout(() => {
            el.style.zIndex = "";
          }, FLIP_MS);
        });
      });
    }
    lastTops.current = { tab, tops };
  }, [rows, tab]);

  const setRowEl = useCallback((id: string) => {
    return (el: HTMLLIElement | null) => {
      if (el) rowEls.current.set(id, el);
      else rowEls.current.delete(id);
    };
  }, []);

  const offline = Boolean(error);

  return (
    <div className="pb-4">
      <header className="px-4 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              <PinIcon className="h-3.5 w-3.5" />
              London · Gym leaderboard
            </p>
            <h1 className="mt-1 text-[34px] font-extrabold leading-none tracking-tight">Aldgate</h1>
          </div>
          <LivePill offline={offline} hasData={Boolean(board)} />
        </div>
        <p className="mt-3 text-sm text-muted">
          {board?.total ? (
            <>
              <span className="font-semibold text-ink tabular-nums">{board.total}</span> climber
              {board.total === 1 ? "" : "s"} on this board · updates live
            </>
          ) : (
            "Updates live as climbers log their climbs."
          )}
        </p>
      </header>

      <div
        className="sticky top-0 z-30 mt-4 bg-bg/90 px-4 pb-3 pt-2 backdrop-blur-md"
        style={{ paddingTop: "calc(8px + env(safe-area-inset-top))" }}
      >
        <div className="grid grid-cols-4 gap-1 rounded-full bg-surface p-1" role="tablist" aria-label="Leaderboard">
          {LEADERBOARD_TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(t)}
                className={`h-11 rounded-full text-[13px] font-semibold transition ${
                  active ? "bg-ink text-bg" : "text-muted active:bg-surface-2"
                }`}
              >
                {TAB_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        <p className="mb-3 text-[13px] leading-relaxed text-faint">{TAB_META[tab].blurb}</p>

        {!board && !error && <SkeletonList />}

        {!board && error && (
          <div className="rounded-3xl bg-surface p-6 text-center">
            <h2 className="text-lg font-bold">Can&apos;t load the board</h2>
            <p className="mt-1.5 text-[15px] text-muted">{errorMessage(error)}</p>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full border-2 border-brand px-6 font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
            >
              Try again
            </button>
          </div>
        )}

        {board && rows.length === 0 && (
          <div className="rounded-3xl bg-surface p-6 text-center">
            <h2 className="text-lg font-bold">No climbs logged yet</h2>
            <p className="mt-1.5 text-[15px] text-muted">Review a climb and save it to be first on the board.</p>
            <Link
              href="/review"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 font-semibold text-white transition active:scale-[0.98]"
            >
              Review my climb
            </Link>
          </div>
        )}

        {board && rows.length > 0 && (
          <ol className="relative overflow-hidden rounded-3xl bg-surface">
            {rows.map((row, i) => (
              <Row
                key={row.id}
                ref={setRowEl(row.id)}
                row={row}
                tab={tab}
                isMe={row.id === userId}
                change={changes[row.id]}
                divider={i > 0}
              />
            ))}
          </ol>
        )}

        {board && board.me && (
          // Pinned above the tab bar and its raised Review button.
          <div className="sticky z-20 mt-3" style={{ bottom: "calc(104px + env(safe-area-inset-bottom))" }}>
            <ol className="overflow-hidden rounded-3xl bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.6)] ring-1 ring-brand/40">
              <Row row={board.me} tab={tab} isMe change={changes[board.me.id]} divider={false} />
            </ol>
          </div>
        )}

        {board && userId && !meInRows && !board.me && (
          <div className="mt-3 rounded-3xl border border-dashed border-line p-5 text-center">
            <p className="font-semibold">
              {tab === "week" ? "You haven't logged a climb this week" : "You're not on this board yet"}
            </p>
            <p className="mt-1 text-sm text-muted">Review a climb and save it to your profile to get on the board.</p>
            <Link href="/review" className="mt-3 inline-flex h-11 items-center gap-1 font-semibold text-brand">
              Review my climb
              <ChevronRightIcon />
            </Link>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/why"
            className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-muted transition active:bg-surface"
          >
            Why this matters
            <ChevronRightIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}

function LivePill({ offline, hasData }: { offline: boolean; hasData: boolean }) {
  return (
    <span
      className={`mt-1 inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold uppercase tracking-wider ${
        offline ? "bg-surface text-muted" : "bg-brand/15 text-brand"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${offline ? "bg-faint" : "animate-live-pulse bg-brand"}`} />
      {offline ? (hasData ? "Reconnecting" : "Offline") : "Live"}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white shadow-[0_4px_14px_rgb(252_76_2/0.4)]">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-bg">2</span>
    );
  if (rank === 3)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-deep text-sm font-extrabold text-brand ring-1 ring-brand/50">
        3
      </span>
    );
  return <span className="flex h-8 w-8 items-center justify-center text-[15px] font-semibold tabular-nums text-muted">{rank}</span>;
}

function Row({
  row,
  tab,
  isMe,
  change,
  divider,
  ref,
}: {
  row: LeaderboardRow;
  tab: LeaderboardTab;
  isMe: boolean;
  change?: RowChange;
  divider: boolean;
  ref?: React.Ref<HTMLLIElement>;
}) {
  const { value, unit } = formatValue(tab, row.value);
  const dir = change?.dir ?? null;
  const flash = Boolean(change?.valueChanged);

  return (
    <li
      ref={ref}
      className={`relative flex h-[68px] items-center gap-3 pl-3 pr-4 will-change-transform ${isMe ? "bg-brand-deep" : "bg-surface"}`}
      aria-current={isMe ? "true" : undefined}
    >
      {divider && <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-line/70" aria-hidden />}
      {isMe && <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />}

      <div className="relative flex w-8 shrink-0 flex-col items-center">
        <RankBadge rank={row.rank} />
        {dir && (
          <span
            key={`${dir}-${row.rank}`}
            className={`absolute -bottom-3.5 animate-fade-up text-[10px] font-bold leading-none ${
              dir === "up" ? "text-good" : "text-blunder"
            }`}
            aria-label={dir === "up" ? "moved up" : "moved down"}
          >
            {dir === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>

      <Avatar name={row.name} size="sm" highlight={isMe} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate font-semibold">{row.name}</span>
          {isMe && (
            <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white">
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{rowSubtitle(tab, row)}</p>
      </div>

      <p className="shrink-0 text-right">
        <span
          key={flash ? `${row.value}-flash` : "steady"}
          className={`inline-block text-lg font-bold tabular-nums transition-colors duration-700 ${
            flash ? "animate-pop-in text-brand" : "text-ink"
          }`}
        >
          {value}
        </span>
        {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
      </p>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface" aria-busy aria-label="Loading leaderboard">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex h-[68px] items-center gap-3 px-4">
          <div className="h-6 w-6 animate-pulse rounded-full bg-surface-2" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-surface-2" />
          </div>
          <div className="h-5 w-12 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
