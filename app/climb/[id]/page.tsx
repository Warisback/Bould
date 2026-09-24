import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/review/PageHeader";
import ReviewScreen from "@/components/review/ReviewScreen";
import { formatAccuracy } from "@/components/review/format";
import { SentPill } from "@/components/profile/ClimbRow";
import { changeColor, formatSigned, gradeLabel } from "@/lib/format";
import { getClimb, getUser, StorageUnavailableError } from "@/lib/redis";
import type { Climb } from "@/lib/types";
import { parseId } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Climb review · Beta Review",
};

async function load(id: string): Promise<{ climb: Climb; climber: string | null } | "unavailable" | null> {
  try {
    const climb = await getClimb(id);
    if (!climb) return null;
    const user = await getUser(climb.user_id);
    return { climb, climber: user?.name ?? null };
  } catch (err) {
    if (err instanceof StorageUnavailableError) return "unavailable";
    throw err;
  }
}

export default async function ClimbPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const found = await load(id);
  if (!found) notFound();

  if (found === "unavailable") {
    return (
      <div className="px-4">
        <PageHeader title="Climb review" backHref="/profile" />
        <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
          <h2 className="text-xl font-bold">Climbs are offline</h2>
          <p className="mt-2 text-[15px] text-muted">We can&apos;t reach saved climbs right now. Try again in a minute.</p>
        </div>
      </div>
    );
  }

  const { climb, climber } = found;
  const type = climb.type === "flash" ? "Flash" : "Project";
  const when = new Date(climb.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });

  return (
    <ReviewScreen
      review={climb.review}
      banner={
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg font-extrabold tabular-nums">
              {gradeLabel(climb.grade)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate font-semibold">{climber ?? "Climber"}</span>
                <SentPill sent={climb.sent} />
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {type} · {formatAccuracy(climb.accuracy)}% accuracy · {when}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-2xl font-bold leading-none tabular-nums ${changeColor(climb.rating_change)}`}>
                {formatSigned(climb.rating_change)}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-faint">{type} rating</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-faint">
            <span>Virtual replay. The video stays on the phone that filmed it.</span>
            {climb.points_earned ? (
              <span className="shrink-0 font-semibold text-ink">+{climb.points_earned} pts</span>
            ) : null}
          </div>
        </div>
      }
      footer={
        <Link
          href="/profile"
          className="flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
        >
          Back to profile
        </Link>
      }
    />
  );
}
