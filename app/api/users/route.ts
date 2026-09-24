import type { CreateUserResponse } from "@/lib/api";
import { handle, json, jsonError, readJson } from "@/lib/http";
import { getRedis, keys } from "@/lib/redis";
import { ensureSeed } from "@/lib/seed";
import type { User } from "@/lib/types";
import { parseGym, parseName } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_RATING = 1200;

export async function POST(req: Request) {
  return handle(async () => {
    const body = (await readJson(req)) as { name?: unknown; gym?: unknown } | null;
    if (!body || typeof body !== "object") return jsonError("invalid_body", 400);

    const name = parseName(body.name);
    if (!name) return jsonError("invalid_name", 400);
    const gym = parseGym(body.gym);
    if (!gym) return jsonError("invalid_gym", 400);

    const redis = getRedis();
    await ensureSeed(gym);

    const user: User = {
      id: crypto.randomUUID(),
      name,
      gym,
      flash_rating: START_RATING,
      project_rating: START_RATING,
      climbs: 0,
      sends: 0,
      avg_accuracy: 0,
      points: 0,
      created_at: Date.now(),
    };

    const m = redis.multi();
    m.set(keys.user(user.id), user);
    m.zadd(keys.board(gym, "flash"), { score: user.flash_rating, member: user.id });
    m.zadd(keys.board(gym, "project"), { score: user.project_rating, member: user.id });
    m.zadd(keys.board(gym, "points"), { score: user.points, member: user.id });
    await m.exec();

    const res: CreateUserResponse = { user };
    return json(res, 201);
  });
}
