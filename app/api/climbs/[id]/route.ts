import type { ClimbResponse } from "@/lib/api";
import { handle, json, jsonError } from "@/lib/http";
import { getClimb, getUser } from "@/lib/redis";
import { parseId } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return jsonError("not_found", 404);

    const climb = await getClimb(id);
    if (!climb) return jsonError("not_found", 404);

    const user = await getUser(climb.user_id);
    const res: ClimbResponse = { climb, climber: user?.name ?? null };
    return json(res);
  });
}
