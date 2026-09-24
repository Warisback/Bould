"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRightIcon, CheckIcon, CloseIcon, TrophyIcon } from "@/components/icons";
import { formatAccuracy } from "@/components/review/format";
import { ResultPill } from "@/components/review/SummaryCard";
import { ApiError, apiFetch, errorMessage, type SaveClimbResponse } from "@/lib/api";
import { changeColor, formatSigned, formatThousands } from "@/lib/format";
import { pointsForClimb } from "@/lib/points";
import { GRADES } from "@/lib/ratings";
import { findSaved, getSavedRaw, markReviewSaved, subscribeSaved } from "@/lib/savedReviews";
import type { AttemptType, Review } from "@/lib/types";
import { changeUserId, useUserId } from "@/lib/useUserId";
import BottomSheet from "./BottomSheet";
import { useCountUp } from "./CountUp";

export interface SaveToProfileProps {
  review: Review;
  onSaved?: (res: SaveClimbResponse) => void;
  /** preselected grade, e.g. 4 for the sample climb */
  defaultGrade?: number;
  defaultType?: AttemptType;
}

const TYPE_LABEL: Record<AttemptType, string> = { flash: "Flash", project: "Project" };

const getServerRaw = () => null;

function Card({ children }: { children: React.ReactNode }) {
  return <section className="animate-fade-up rounded-3xl bg-surface p-5">{children}</section>;
}

export default function SaveToProfile({ review, onSaved, defaultGrade, defaultType = "flash" }: SaveToProfileProps) {
  const pathname = usePathname() ?? "/";
  const userId = useUserId();
  const savedRaw = useSyncExternalStore(subscribeSaved, getSavedRaw, getServerRaw);
  const stored = useMemo(
    () => (userId ? findSaved(savedRaw, review, userId) : null),
    [savedRaw, review, userId],
  );

  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SaveClimbResponse | null>(null);

  if (userId === undefined) {
    return <div className="h-[168px] animate-pulse rounded-3xl bg-surface" aria-hidden />;
  }

  const joinHref = `/join?next=${encodeURIComponent(pathname)}`;

  if (userId === null) {
    return (
      <Card>
        <h2 className="text-lg font-bold">Save this climb</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Join Aldgate to keep this review on your profile, move your rating and earn points for the climb.
        </p>
        <Link
          href={joinHref}
          className="mt-5 flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]"
        >
          Join to save
        </Link>
      </Card>
    );
  }

  const savedClimbId = result?.climb.id ?? stored?.climb_id ?? null;

  return (
    <>
      {savedClimbId ? (
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-good/15 text-good">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight">Saved to your profile</h2>
              {result ? (
                <p className="mt-0.5 text-sm text-muted">
                  <span className={`font-semibold ${changeColor(result.rating_change)}`}>
                    {formatSigned(result.rating_change)}
                  </span>{" "}
                  {TYPE_LABEL[result.climb.type]} rating ·{" "}
                  <span className="font-semibold text-ink">+{result.points_earned}</span> points
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted">This climb is already on your profile.</p>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href={`/climb/${savedClimbId}`}
              className="flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
            >
              View climb
            </Link>
            <Link
              href={`/gym/aldgate${result ? `?tab=${result.climb.type}` : ""}`}
              className="flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition active:scale-[0.98]"
            >
              Leaderboard
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Log this climb</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                Add the grade and whether it was your first go. Your rating moves, and every climb you log adds points.
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-brand">
              <TrophyIcon />
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.3)] transition active:scale-[0.98]"
          >
            Save to my profile
          </button>
        </Card>
      )}

      {open && (
        <SaveSheet
          review={review}
          userId={userId}
          joinHref={joinHref}
          defaultGrade={defaultGrade}
          defaultType={defaultType}
          result={result}
          onClose={() => setOpen(false)}
          onSaved={(res) => {
            setResult(res);
            markReviewSaved(review, { climb_id: res.climb.id, user_id: userId, saved_at: Date.now() });
            onSaved?.(res);
          }}
        />
      )}
    </>
  );
}

function SaveSheet({
  review,
  userId,
  joinHref,
  defaultGrade,
  defaultType,
  result,
  onClose,
  onSaved,
}: {
  review: Review;
  userId: string;
  joinHref: string;
  defaultGrade?: number;
  defaultType: AttemptType;
  result: SaveClimbResponse | null;
  onClose: () => void;
  onSaved: (res: SaveClimbResponse) => void;
}) {
  const titleId = useId();
  const [grade, setGrade] = useState<number | null>(defaultGrade ?? null);
  const [type, setType] = useState<AttemptType>(defaultType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; rejoin: boolean } | null>(null);
  const inFlight = useRef(false);

  async function save() {
    if (grade === null || inFlight.current || result) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<SaveClimbResponse>("/api/climbs", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, grade, type, review }),
      });
      onSaved(res);
    } catch (err) {
      const rejoin = err instanceof ApiError && err.code === "user_not_found";
      setError({ message: errorMessage(err), rejoin });
      inFlight.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClose={onClose} labelledBy={titleId}>
      {(close) => (
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-xl font-bold">
              {result ? "Climb saved" : "Save to my profile"}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition active:bg-surface-2"
            >
              <CloseIcon />
            </button>
          </div>

          {result ? (
            <SavedResult result={result} sent={review.sent} />
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">From your review</p>
                  <p className="mt-0.5 text-sm text-ink">
                    <span className="font-bold tabular-nums">{formatAccuracy(review.accuracy)}%</span> accuracy
                  </p>
                </div>
                <ResultPill sent={review.sent} />
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Grade</p>
                <p className="text-sm font-semibold text-ink">{grade === null ? "Pick one" : `V${grade}`}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Grade">
                {GRADES.map((g) => {
                  const selected = grade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setGrade(g)}
                      className={`h-14 rounded-2xl text-lg font-extrabold tabular-nums transition active:scale-95 ${
                        selected ? "bg-brand text-white shadow-[0_6px_18px_rgb(252_76_2/0.35)]" : "bg-surface-2 text-ink active:bg-line"
                      }`}
                    >
                      V{g}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Attempt</p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="Attempt">
                {(
                  [
                    ["flash", "Flash", "First go"],
                    ["project", "Project", "Worked it"],
                  ] as const
                ).map(([value, label, sub]) => {
                  const selected = type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setType(value)}
                      className={`flex h-14 flex-col items-center justify-center rounded-xl transition ${
                        selected ? "bg-ink text-bg" : "text-muted active:bg-line"
                      }`}
                    >
                      <span className="text-[15px] font-bold leading-tight">{label}</span>
                      <span className={`text-xs ${selected ? "text-bg/70" : "text-faint"}`}>{sub}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 min-h-5 text-center text-sm text-muted">
                {grade === null ? (
                  "Harder grades and sends earn more points."
                ) : (
                  <>
                    This climb earns{" "}
                    <span className="font-bold text-ink">+{pointsForClimb(grade, review.sent, review.accuracy)} points</span>
                  </>
                )}
              </p>

              {error && (
                <div role="alert" className="mt-3 animate-fade-up rounded-2xl bg-blunder/10 px-4 py-3 text-sm text-blunder">
                  {error.message}
                  {error.rejoin && (
                    <Link
                      href={joinHref}
                      onClick={() => changeUserId(null)}
                      className="ml-1 font-semibold underline underline-offset-2"
                    >
                      Join again
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={save}
                disabled={grade === null || saving}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving…
                  </>
                ) : (
                  "Save climb"
                )}
              </button>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function SavedResult({ result, sent }: { result: SaveClimbResponse; sent: boolean }) {
  const shown = useCountUp(result.rating_change);
  const type = result.climb.type;
  const moved = result.rank !== null && result.rank_before !== null ? result.rank_before - result.rank : 0;

  return (
    <div className="pb-1 pt-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{TYPE_LABEL[type]} rating</p>
      <p
        className={`mt-1 animate-pop-in text-[88px] font-extrabold leading-none tracking-tight tabular-nums ${changeColor(result.rating_change)}`}
        aria-label={`Rating change ${formatSigned(result.rating_change)}`}
      >
        {formatSigned(shown)}
      </p>
      <p className="mt-3 flex items-center justify-center gap-2 text-[15px] tabular-nums text-muted">
        <span>{result.rating_before}</span>
        <ArrowRightIcon className="h-4 w-4 text-faint" />
        <span className="font-bold text-ink">{result.rating_after}</span>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="animate-fade-up rounded-2xl bg-surface-2 p-4" style={{ animationDelay: "250ms" }}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Points</p>
          <p className="mt-1 text-3xl font-bold tabular-nums leading-none">+{result.points_earned}</p>
          <p className="mt-1.5 text-xs text-faint">{formatThousands(result.user.points)} total</p>
        </div>
        <div className="animate-fade-up rounded-2xl bg-surface-2 p-4" style={{ animationDelay: "350ms" }}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{TYPE_LABEL[type]} rank</p>
          <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{result.rank ? `#${result.rank}` : "–"}</p>
          <p className={`mt-1.5 text-xs ${moved > 0 ? "text-good" : moved < 0 ? "text-blunder" : "text-faint"}`}>
            {moved > 0 ? `▲ ${moved} place${moved === 1 ? "" : "s"}` : moved < 0 ? `▼ ${-moved} place${moved === -1 ? "" : "s"}` : "at Aldgate"}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {sent
          ? "Sent and logged. Keep climbing to push your rating and points higher."
          : "Logged. Falls still earn points — go back and try the crux fix."}
      </p>

      <div className="mt-5 space-y-3">
        <Link
          href={`/gym/aldgate?tab=${type}`}
          className="flex h-14 items-center justify-center rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)] transition active:scale-[0.98]"
        >
          See leaderboard
        </Link>
        <Link
          href="/profile"
          className="flex h-14 items-center justify-center rounded-full border-2 border-brand text-[17px] font-bold text-brand transition active:scale-[0.98] active:bg-brand/10"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}
