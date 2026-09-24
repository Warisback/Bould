import type { UserProfileResponse } from "@/lib/api";
import { handle, json, jsonError } from "@/lib/http";
import { getRanks, getUser, getUserClimbs } from "@/lib/redis";
import { parseId } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return jsonError("not_found", 404);

    const user = await getUser(id);
    if (!user) return jsonError("not_found", 404);

    const [climbs, { ranks, week_climbs }] = await Promise.all([getUserClimbs(id, 50), getRanks(user.gym, id)]);
    const res: UserProfileResponse = { user, climbs, ranks, week_climbs };
    return json(res);
  });
}
