/**
 * Server only. Upstash Redis is the app's only database.
 *
 * Key schema (no global prefix):
 *   user:{id}                 User JSON
 *   climb:{id}                Climb JSON
 *   user:{id}:climbs          LIST of climb ids, newest first (LPUSH)
 *   lb:{gym}:flash            ZSET user id -> flash rating
 *   lb:{gym}:project          ZSET user id -> project rating
 *   lb:{gym}:points           ZSET user id -> points
 *   lb:{gym}:week:{YYYY-Www}  ZSET user id -> climbs saved in that ISO week (UTC)
 *   seed:{gym}:v1             marker: seed users written
 *   seed:{gym}:week:{YYYY-Www} marker: seed users' counts written for that week
 *   lock:user:{id}            short-lived lock while a climb is being saved
 */
import { Redis } from "@upstash/redis";
import type { Ranks } from "./api";
import type { Climb, GymId, LeaderboardResponse, LeaderboardRow, LeaderboardTab, User } from "./types";
import { isoWeek } from "./week";

export class StorageUnavailableError extends Error {
  constructor() {
    super("storage_unavailable");
    this.name = "StorageUnavailableError";
  }
}

export function redisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

let client: Redis | null = null;

/** Lazy singleton. Throws StorageUnavailableError when the Redis env vars are missing. */
export function getRedis(): Redis {
  if (!redisConfigured()) throw new StorageUnavailableError();
  client ??= Redis.fromEnv();
  return client;
}

/** Week leaderboards are kept for six weeks, then expire. */
export const WEEK_TTL_SECONDS = 60 * 60 * 24 * 7 * 6;

export type RatingBoard = "flash" | "project";

export const keys = {
  user: (id: string) => `user:${id}`,
  climb: (id: string) => `climb:${id}`,
  userClimbs: (id: string) => `user:${id}:climbs`,
  board: (gym: GymId, board: RatingBoard | "points") => `lb:${gym}:${board}`,
  week: (gym: GymId, week: string = isoWeek()) => `lb:${gym}:week:${week}`,
  seed: (gym: GymId) => `seed:${gym}:v1`,
  seedWeek: (gym: GymId, week: string = isoWeek()) => `seed:${gym}:week:${week}`,
  lock: (userId: string) => `lock:user:${userId}`,
};

/** The ZSET behind a leaderboard tab. */
export function tabKey(gym: GymId, tab: LeaderboardTab, week: string = isoWeek()): string {
  return tab === "week" ? keys.week(gym, week) : keys.board(gym, tab);
}

export async function getUser(id: string): Promise<User | null> {
  return (await getRedis().get<User>(keys.user(id))) ?? null;
}

export async function getUsers(ids: string[]): Promise<(User | null)[]> {
  if (ids.length === 0) return [];
  return getRedis().mget<(User | null)[]>(...ids.map(keys.user));
}

export async function getClimb(id: string): Promise<Climb | null> {
  return (await getRedis().get<Climb>(keys.climb(id))) ?? null;
}

/** Latest climbs for a user, newest first. */
export async function getUserClimbs(userId: string, limit = 50): Promise<Climb[]> {
  const redis = getRedis();
  const ids = await redis.lrange<string>(keys.userClimbs(userId), 0, limit - 1);
  if (ids.length === 0) return [];
  const climbs = await redis.mget<(Climb | null)[]>(...ids.map((id) => keys.climb(String(id))));
  return climbs.filter((c): c is Climb => c !== null);
}

const toRank = (r: unknown): number | null => (typeof r === "number" ? r + 1 : null);

/** 1-based ranks on each board (null when not on it) and this week's climb count. */
export async function getRanks(gym: GymId, userId: string): Promise<{ ranks: Ranks; week_climbs: number }> {
  const p = getRedis().pipeline();
  p.zrevrank(keys.board(gym, "flash"), userId);
  p.zrevrank(keys.board(gym, "project"), userId);
  p.zrevrank(keys.board(gym, "points"), userId);
  p.zrevrank(keys.week(gym), userId);
  p.zscore(keys.week(gym), userId);
  const [flash, project, points, week, weekScore] = await p.exec<
    [number | null, number | null, number | null, number | null, number | null]
  >();
  return {
    ranks: { flash: toRank(flash), project: toRank(project), points: toRank(points), week: toRank(week) },
    week_climbs: Number(weekScore ?? 0),
  };
}

function toRow(rank: number, id: string, value: number, user: User | null): LeaderboardRow {
  return {
    rank,
    id,
    name: user?.name ?? "Climber",
    value: Math.round(value),
    climbs: user?.climbs,
    sends: user?.sends,
  };
}

/** Top `limit` rows of a board, plus the requesting user's row when they are outside it. */
export async function getLeaderboard(
  gym: GymId,
  tab: LeaderboardTab,
  me: string | null,
  limit = 20,
): Promise<LeaderboardResponse> {
  const redis = getRedis();
  const key = tabKey(gym, tab);

  const p = redis.pipeline();
  p.zrange(key, 0, limit - 1, { rev: true, withScores: true });
  p.zcard(key);
  if (me) {
    p.zrevrank(key, me);
    p.zscore(key, me);
  }
  const [flat, total, meRank, meScore] = await p.exec<[(string | number)[], number, number | null, number | null]>();

  const entries: { id: string; value: number }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    entries.push({ id: String(flat[i]), value: Number(flat[i + 1]) });
  }

  const meOutside = Boolean(me) && typeof meRank === "number" && meRank >= limit && meScore !== null;
  const ids = entries.map((e) => e.id);
  if (meOutside && me) ids.push(me);
  const users = await getUsers(ids);

  const rows = entries.map((e, i) => toRow(i + 1, e.id, e.value, users[i]));
  const meRow =
    meOutside && me && typeof meRank === "number"
      ? toRow(meRank + 1, me, Number(meScore), users[users.length - 1])
      : null;

  return { tab, rows, me: meRow, total: Number(total ?? 0), updated_at: Date.now() };
}

export interface GymStats {
  /** climbers on the board */
  members: number;
  /** climbs saved this week */
  climbs_this_week: number;
  /** climbers who saved at least one climb this week */
  active_this_week: number;
}

export async function getGymStats(gym: GymId): Promise<GymStats> {
  const p = getRedis().pipeline();
  p.zcard(keys.board(gym, "points"));
  p.zrange(keys.week(gym), 0, -1, { withScores: true });
  const [members, flat] = await p.exec<[number, (string | number)[]]>();
  let climbs = 0;
  let active = 0;
  for (let i = 1; i < flat.length; i += 2) {
    const n = Number(flat[i]);
    climbs += n;
    if (n > 0) active += 1;
  }
  return { members: Number(members ?? 0), climbs_this_week: climbs, active_this_week: active };
}
