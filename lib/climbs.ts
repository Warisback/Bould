/** Server only. Saving a climb: rating change, points, stats and leaderboards in one transaction. */
import type { SaveClimbResponse } from "./api";
import { ratingChange } from "./elo";
import { pointsForClimb } from "./points";
import { getRedis, keys, WEEK_TTL_SECONDS } from "./redis";
import type { AttemptType, Climb, Review, User } from "./types";

export class UserNotFoundError extends Error {
  constructor() {
    super("user_not_found");
    this.name = "UserNotFoundError";
  }
}

export class SaveInProgressError extends Error {
  constructor() {
    super("save_in_progress");
    this.name = "SaveInProgressError";
  }
}

const LOCK_MS = 5000;

async function acquireLock(userId: string): Promise<string | null> {
  const redis = getRedis();
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 6; attempt++) {
    const ok = await redis.set(keys.lock(userId), token, { nx: true, px: LOCK_MS });
    if (ok === "OK") return token;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function releaseLock(userId: string, token: string) {
  const redis = getRedis();
  // Only release our own lock (it may have expired and been taken by another save).
  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [keys.lock(userId)],
    [token],
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function saveClimb(input: {
  userId: string;
  grade: number;
  type: AttemptType;
  review: Review;
}): Promise<SaveClimbResponse> {
  const { userId, grade, type, review } = input;
  const redis = getRedis();

  const lock = await acquireLock(userId);
  if (!lock) throw new SaveInProgressError();

  try {
    // Aldgate is the only gym, so the "before" rank can be read in the same round trip as the user.
    const pre = redis.pipeline();
    pre.get<User>(keys.user(userId));
    pre.zrevrank(keys.board("aldgate", type), userId);
    const [user, rankBeforeRaw] = await pre.exec<[User | null, number | null]>();
    if (!user) throw new UserNotFoundError();

    const gym = user.gym;
    const gymBoard = keys.board(gym, type);
    const pointsBoard = keys.board(gym, "points");
    const weekBoard = keys.week(gym);

    const ratingField = type === "flash" ? "flash_rating" : "project_rating";
    const ratingBefore = user[ratingField];
    const change = ratingChange(ratingBefore, grade, review.sent, review.accuracy);
    const ratingAfter = ratingBefore + change;
    const pointsEarned = pointsForClimb(grade, review.sent, review.accuracy);

    const prevClimbs = user.climbs ?? 0;
    const updated: User = {
      ...user,
      [ratingField]: ratingAfter,
      climbs: prevClimbs + 1,
      sends: (user.sends ?? 0) + (review.sent ? 1 : 0),
      avg_accuracy: round1(((user.avg_accuracy ?? 0) * prevClimbs + review.accuracy) / (prevClimbs + 1)),
      points: (user.points ?? 0) + pointsEarned,
    };

    const climb: Climb = {
      id: crypto.randomUUID(),
      user_id: userId,
      gym,
      grade,
      type,
      sent: review.sent,
      accuracy: review.accuracy,
      rating_change: change,
      points_earned: pointsEarned,
      review,
      created_at: Date.now(),
    };

    const m = redis.multi();
    m.set(keys.climb(climb.id), climb);
    m.lpush(keys.userClimbs(userId), climb.id);
    m.set(keys.user(userId), updated);
    m.zadd(gymBoard, { score: ratingAfter, member: userId });
    m.zadd(pointsBoard, { score: updated.points, member: userId });
    m.zincrby(weekBoard, 1, userId);
    m.expire(weekBoard, WEEK_TTL_SECONDS);
    m.zrevrank(keys.board(gym, "flash"), userId);
    m.zrevrank(keys.board(gym, "project"), userId);
    m.zrevrank(pointsBoard, userId);
    m.zrevrank(weekBoard, userId);
    const res = await m.exec<unknown[]>();
    const [flashRank, projectRank, pointsRank, weekRank] = res.slice(-4).map((r) => (typeof r === "number" ? r + 1 : null));

    const ranks = { flash: flashRank, project: projectRank, points: pointsRank, week: weekRank };
    return {
      climb,
      user: updated,
      rating_before: ratingBefore,
      rating_after: ratingAfter,
      rating_change: change,
      points_earned: pointsEarned,
      rank: ranks[type],
      rank_before: typeof rankBeforeRaw === "number" ? rankBeforeRaw + 1 : null,
      ranks,
    };
  } finally {
    await releaseLock(userId, lock).catch(() => {});
  }
}
