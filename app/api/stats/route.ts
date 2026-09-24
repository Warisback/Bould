import type { NextRequest } from "next/server";
import type { StatsResponse } from "@/lib/api";
import { handle, json, jsonError } from "@/lib/http";
import { getGymStats } from "@/lib/redis";
import { ensureSeed } from "@/lib/seed";
import { parseGym } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const gym = parseGym(req.nextUrl.searchParams.get("gym"));
    if (!gym) return jsonError("unknown_gym", 404);
    await ensureSeed(gym);
    const res: StatsResponse = await getGymStats(gym);
    return json(res);
  });
}
