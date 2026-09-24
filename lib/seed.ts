/**
 * Server only. Eight Aldgate regulars so the board is never empty.
 * Seeding is lazy and idempotent: every write sets an absolute value, so two
 * requests racing to seed write the same thing.
 */
import { getRedis, keys, WEEK_TTL_SECONDS } from "./redis";
import type { GymId, User } from "./types";
import { isoWeek } from "./week";

interface SeedClimber {
  name: string;
  flash: number;
  project: number;
  climbs: number;
  sends: number;
  avg_accuracy: number;
  points: number;
  /** typical climbs per week */
  week: number;
  /** joined this many days ago */
  joined_days_ago: number;
}

// Orderings differ between tabs on purpose: Kemi flashes better than she projects,
// Tomás is the project king, Josh logs a lot of volume.
const SEED_CLIMBERS: SeedClimber[] = [
  { name: "Priya S.", flash: 1620, project: 1580, climbs: 140, sends: 98, avg_accuracy: 81.4, points: 14812, week: 9, joined_days_ago: 610 },
  { name: "Tomás R.", flash: 1490, project: 1700, climbs: 118, sends: 71, avg_accuracy: 76.2, points: 11694, week: 14, joined_days_ago: 540 },
  { name: "Kemi A.", flash: 1545, project: 1415, climbs: 86, sends: 57, avg_accuracy: 84.0, points: 7761, week: 6, joined_days_ago: 421 },
  { name: "Josh W.", flash: 1310, project: 1490, climbs: 64, sends: 33, avg_accuracy: 68.5, points: 4703, week: 11, joined_days_ago: 298 },
  { name: "Mei L.", flash: 1385, project: 1260, climbs: 52, sends: 34, avg_accuracy: 79.1, points: 3748, week: 4, joined_days_ago: 263 },
  { name: "Callum B.", flash: 1205, project: 1345, climbs: 37, sends: 17, avg_accuracy: 63.7, points: 2139, week: 8, joined_days_ago: 152 },
  { name: "Sana K.", flash: 1150, project: 1180, climbs: 23, sends: 12, avg_accuracy: 71.8, points: 1164, week: 3, joined_days_ago: 88 },
  { name: "Olly P.", flash: 1080, project: 1100, climbs: 12, sends: 5, avg_accuracy: 58.3, points: 472, week: 1, joined_days_ago: 34 },
];

export const SEED_COUNT = SEED_CLIMBERS.length;

export function seedId(gym: GymId, i: number): string {
  return `seed-${gym}-${i + 1}`;
}

function seedUsers(gym: GymId, now: number): User[] {
  return SEED_CLIMBERS.map((s, i) => ({
    id: seedId(gym, i),
    name: s.name,
    gym,
    flash_rating: s.flash,
    project_rating: s.project,
    climbs: s.climbs,
    sends: s.sends,
    avg_accuracy: s.avg_accuracy,
    points: s.points,
    // Round to the day so re-seeding doesn't make "joined" dates drift by minutes.
    created_at: Math.floor((now - s.joined_days_ago * 86_400_000) / 86_400_000) * 86_400_000,
  }));
}

/** Deterministic -2..+2 wobble per climber per week, so each week's board looks a little different. */
function weekCount(base: number, week: string, id: string): number {
  let h = 2166136261;
  for (const ch of `${week}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const wobble = (Math.abs(h) % 5) - 2;
  return Math.min(14, Math.max(1, base + wobble));
}

function weekMembers(gym: GymId, week: string) {
  return SEED_CLIMBERS.map((s, i) => ({ score: weekCount(s.week, week, seedId(gym, i)), member: seedId(gym, i) }));
}

async function writeSeed(gym: GymId, week: string) {
  const redis = getRedis();
  const users = seedUsers(gym, Date.now());
  const m = redis.multi();
  for (const u of users) m.set(keys.user(u.id), u);
  const [first, ...rest] = users;
  m.zadd(keys.board(gym, "flash"), { score: first.flash_rating, member: first.id }, ...rest.map((u) => ({ score: u.flash_rating, member: u.id })));
  m.zadd(keys.board(gym, "project"), { score: first.project_rating, member: first.id }, ...rest.map((u) => ({ score: u.project_rating, member: u.id })));
  m.zadd(keys.board(gym, "points"), { score: first.points, member: first.id }, ...rest.map((u) => ({ score: u.points, member: u.id })));
  const [w0, ...wRest] = weekMembers(gym, week);
  m.zadd(keys.week(gym, week), w0, ...wRest);
  m.expire(keys.week(gym, week), WEEK_TTL_SECONDS);
  m.set(keys.seed(gym), Date.now());
  m.set(keys.seedWeek(gym, week), Date.now(), { ex: WEEK_TTL_SECONDS });
  await m.exec();
}

async function writeWeekSeed(gym: GymId, week: string) {
  const redis = getRedis();
  const m = redis.multi();
  const [w0, ...wRest] = weekMembers(gym, week);
  m.zadd(keys.week(gym, week), w0, ...wRest);
  m.expire(keys.week(gym, week), WEEK_TTL_SECONDS);
  m.set(keys.seedWeek(gym, week), Date.now(), { ex: WEEK_TTL_SECONDS });
  await m.exec();
}

/** Makes sure the seed climbers exist, and have counts for the current week. Cheap when already seeded. */
export async function ensureSeed(gym: GymId): Promise<void> {
  const redis = getRedis();
  const week = isoWeek();
  const [seeded, weekSeeded] = await redis.mget<(number | null)[]>(keys.seed(gym), keys.seedWeek(gym, week));
  if (!seeded) {
    await writeSeed(gym, week);
  } else if (!weekSeeded) {
    await writeWeekSeed(gym, week);
  }
}

/** Deletes and re-creates the seed climbers and this week's seed counts. Real users are untouched. */
export async function resetSeed(gym: GymId): Promise<number> {
  const redis = getRedis();
  const week = isoWeek();
  const ids = SEED_CLIMBERS.map((_, i) => seedId(gym, i));
  const m = redis.multi();
  m.del(...ids.map(keys.user), ...ids.map(keys.userClimbs));
  m.zrem(keys.board(gym, "flash"), ...ids);
  m.zrem(keys.board(gym, "project"), ...ids);
  m.zrem(keys.board(gym, "points"), ...ids);
  m.zrem(keys.week(gym, week), ...ids);
  m.del(keys.seed(gym), keys.seedWeek(gym, week));
  await m.exec();
  await writeSeed(gym, week);
  return ids.length;
}
