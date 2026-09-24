import { initial } from "@/lib/format";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-20 w-20 text-3xl",
} as const;

/** Initial in a circle. `highlight` is used for the current climber. */
export default function Avatar({
  name,
  size = "md",
  highlight = false,
}: {
  name: string;
  size?: keyof typeof SIZES;
  highlight?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${SIZES[size]} ${
        highlight ? "bg-brand text-white" : "bg-surface-2 text-ink"
      }`}
    >
      {initial(name)}
    </span>
  );
}
