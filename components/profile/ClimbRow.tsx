import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { formatAccuracy } from "@/components/review/format";
import { changeColor, formatRelative, formatSigned, gradeLabel } from "@/lib/format";
import type { Climb } from "@/lib/types";

export function SentPill({ sent }: { sent: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        sent ? "bg-good/15 text-good" : "bg-blunder/15 text-blunder"
      }`}
    >
      <span className={`h-1 w-1 rounded-full ${sent ? "bg-good" : "bg-blunder"}`} />
      {sent ? "Sent" : "Fell"}
    </span>
  );
}

/** One past climb: grade, attempt type, result, accuracy, rating change. Opens the saved review. */
export default function ClimbRow({ climb }: { climb: Climb }) {
  return (
    <Link
      href={`/climb/${climb.id}`}
      className="flex items-center gap-3 rounded-2xl bg-surface p-3 pr-3.5 transition active:scale-[0.99] active:bg-surface-2"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg font-extrabold tabular-nums">
        {gradeLabel(climb.grade)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="font-semibold">{climb.type === "flash" ? "Flash" : "Project"}</span>
          <SentPill sent={climb.sent} />
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {formatAccuracy(climb.accuracy)}% accuracy · {formatRelative(climb.created_at)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-lg font-bold leading-none tabular-nums ${changeColor(climb.rating_change)}`}>
          {formatSigned(climb.rating_change)}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-faint">
          {climb.points_earned ? `+${climb.points_earned} pts` : "rating"}
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-faint" />
    </Link>
  );
}
