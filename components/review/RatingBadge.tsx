import { RATING_META } from "@/lib/ratings";
import type { MoveRating } from "@/lib/types";

const SIZES = {
  xs: "h-[18px] w-[18px] text-[9px]",
  sm: "h-[22px] w-[22px] text-[11px]",
  md: "h-7 w-7 text-[13px]",
  lg: "h-9 w-9 text-base",
} as const;

/** chess.com-style annotation badge: the rating symbol on a circle of its colour. */
export default function RatingBadge({
  rating,
  size = "sm",
  className = "",
}: {
  rating: MoveRating;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const meta = RATING_META[rating];
  return (
    <span
      role="img"
      aria-label={meta.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none tracking-tighter text-bg ${meta.bg} ${SIZES[size]} ${className}`}
    >
      {meta.symbol}
    </span>
  );
}
