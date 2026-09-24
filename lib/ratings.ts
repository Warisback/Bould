import type { MoveRating } from "./types";

export const RATING_META: Record<
  MoveRating,
  { label: string; symbol: string; color: string; text: string; bg: string }
> = {
  brilliant: { label: "Brilliant", symbol: "!!", color: "var(--color-brilliant)", text: "text-brilliant", bg: "bg-brilliant" },
  great: { label: "Great", symbol: "!", color: "var(--color-great)", text: "text-great", bg: "bg-great" },
  good: { label: "Good", symbol: "✓", color: "var(--color-good)", text: "text-good", bg: "bg-good" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", color: "var(--color-inaccuracy)", text: "text-inaccuracy", bg: "bg-inaccuracy" },
  mistake: { label: "Mistake", symbol: "?", color: "var(--color-mistake)", text: "text-mistake", bg: "bg-mistake" },
  blunder: { label: "Blunder", symbol: "??", color: "var(--color-blunder)", text: "text-blunder", bg: "bg-blunder" },
};

export const GRADES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export const GYMS = {
  aldgate: { id: "aldgate", name: "Aldgate" },
} as const;
