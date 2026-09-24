import { formatThousands } from "./format";
import type { LeaderboardRow, LeaderboardTab } from "./types";

export const LEADERBOARD_TABS: readonly LeaderboardTab[] = ["points", "flash", "project", "week"];

export function isLeaderboardTab(v: unknown): v is LeaderboardTab {
  return typeof v === "string" && (LEADERBOARD_TABS as readonly string[]).includes(v);
}

export const TAB_META: Record<LeaderboardTab, { label: string; blurb: string }> = {
  points: {
    label: "Points",
    blurb: "Every climb you log adds points. Harder grades, sends and cleaner technique add more.",
  },
  flash: {
    label: "Flash",
    blurb: "Rating from first-go attempts. Send above your level and it jumps.",
  },
  project: {
    label: "Project",
    blurb: "Rating from climbs you've worked. Sending harder grades moves it most.",
  },
  week: {
    label: "This week",
    blurb: "Climbs logged since Monday. Resets every week.",
  },
};

/** The big number on a row, and its small unit. */
export function formatValue(tab: LeaderboardTab, value: number): { value: string; unit: string } {
  if (tab === "points") return { value: formatThousands(value), unit: "pts" };
  if (tab === "week") return { value: String(value), unit: value === 1 ? "climb" : "climbs" };
  return { value: String(Math.round(value)), unit: "" };
}

/** The muted line under a climber's name. */
export function rowSubtitle(tab: LeaderboardTab, row: LeaderboardRow): string {
  const climbs = row.climbs ?? 0;
  const sends = row.sends ?? 0;
  if (climbs === 0) return "New climber";
  if (tab === "points") return `${climbs} climb${climbs === 1 ? "" : "s"} logged`;
  if (tab === "week") return `${climbs} climb${climbs === 1 ? "" : "s"} all-time`;
  return `${Math.round((sends / climbs) * 100)}% sends · ${climbs} climb${climbs === 1 ? "" : "s"}`;
}
