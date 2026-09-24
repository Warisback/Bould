import type { NextRequest } from "next/server";
import { handle, json, jsonError } from "@/lib/http";
import { isLeaderboardTab } from "@/lib/leaderboard";
import { getLeaderboard } from "@/lib/redis";
import { ensureSeed } from "@/lib/seed";
import { parseGym, parseId } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const q = req.nextUrl.searchParams;
    const gym = parseGym(q.get("gym"));
    if (!gym) return jsonError("unknown_gym", 404);
    const tab = q.get("tab") ?? "points";
    if (!isLeaderboardTab(tab)) return jsonError("invalid_tab", 400);
    const me = parseId(q.get("me"));

    await ensureSeed(gym);
    return json(await getLeaderboard(gym, tab, me));
  });
}
