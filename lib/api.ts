/** Response shapes of the app's API routes, plus a small fetch helper for client components. */
import type { AttemptType, Climb, Review, User } from "./types";

export interface Ranks {
  flash: number | null;
  project: number | null;
  points: number | null;
  week: number | null;
}

export interface CreateUserResponse {
  user: User;
}

export interface UserProfileResponse {
  user: User;
  /** latest 50, newest first */
  climbs: Climb[];
  ranks: Ranks;
  week_climbs: number;
}

export interface SaveClimbRequest {
  user_id: string;
  grade: number;
  type: AttemptType;
  review: Review;
}

export interface SaveClimbResponse {
  climb: Climb;
  user: User;
  rating_before: number;
  rating_after: number;
  rating_change: number;
  points_earned: number;
  /** rank on the flash or project board (matching the climb type) after saving */
  rank: number | null;
  /** the same rank before saving */
  rank_before: number | null;
  ranks: Ranks;
}

export interface ClimbResponse {
  climb: Climb;
  /** the climber's display name, when they still exist */
  climber: string | null;
}

export interface StatsResponse {
  members: number;
  climbs_this_week: number;
  active_this_week: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** fetch + JSON with `{ error }` bodies turned into ApiError. Network failures become ApiError("network", 0). */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("network", 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const code =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `http_${res.status}`;
    throw new ApiError(code, res.status);
  }
  return data as T;
}

/** Friendly copy for an API failure. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "storage_unavailable") return "The gym board is offline right now. Try again in a minute.";
    if (err.code === "network") return "No connection. Check your signal and try again.";
    if (err.code === "invalid_name") return "Pick a name between 2 and 20 characters.";
    if (err.code === "user_not_found") return "We couldn't find your climber on this board.";
    if (err.code === "save_in_progress") return "Still saving your last climb. Try again in a second.";
  }
  return "Something went wrong. Try again.";
}
