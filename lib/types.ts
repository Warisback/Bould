export const RATINGS = [
  "brilliant",
  "great",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
] as const;

export type MoveRating = (typeof RATINGS)[number];

export interface Move {
  /** seconds from the start of the video */
  t: number;
  move: string;
  rating: MoveRating;
  why: string;
  better: string | null;
  /** 0-100 chance of sending from this point */
  send_chance: number;
}

export interface Crux {
  t: number;
  what_went_wrong: string;
  try_this: string;
}

export interface Review {
  sent: boolean;
  accuracy: number;
  summary: string;
  crux: Crux | null;
  moves: Move[];
  /** true when Gemini failed and this is the canned sample */
  fallback?: boolean;
}

export type GymId = "aldgate";

export type AttemptType = "flash" | "project";

export interface User {
  id: string;
  name: string;
  gym: GymId;
  flash_rating: number;
  project_rating: number;
  climbs: number;
  sends: number;
  avg_accuracy: number;
  /** grows with every saved climb, never goes down */
  points: number;
  created_at: number;
}

export interface Climb {
  id: string;
  user_id: string;
  gym: GymId;
  /** V grade, 0-8 */
  grade: number;
  type: AttemptType;
  sent: boolean;
  accuracy: number;
  rating_change: number;
  /** points this climb added to the user's total */
  points_earned?: number;
  review: Review;
  created_at: number;
}

export interface Frame {
  /** seconds from the start of the video */
  t: number;
  /** base64 JPEG, no data: prefix */
  data: string;
}

export type LeaderboardTab = "points" | "flash" | "project" | "week";

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  value: number;
  /** extra context for the row's subtitle */
  climbs?: number;
  sends?: number;
}

export interface LeaderboardResponse {
  tab: LeaderboardTab;
  rows: LeaderboardRow[];
  /** the requesting user's row when they are outside the top 20 */
  me: LeaderboardRow | null;
  /** climbers on this board */
  total?: number;
  updated_at: number;
}
