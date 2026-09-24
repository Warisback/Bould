import { SaveInProgressError, saveClimb, UserNotFoundError } from "@/lib/climbs";
import { handle, json, jsonError, readJson } from "@/lib/http";
import { getRedis } from "@/lib/redis";
import { parseAttemptType, parseGrade, parseId, parseReview } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = (await readJson(req)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return jsonError("invalid_body", 400);

    const userId = parseId(body.user_id);
    if (!userId) return jsonError("invalid_user_id", 400);
    const grade = parseGrade(body.grade);
    if (grade === null) return jsonError("invalid_grade", 400);
    const type = parseAttemptType(body.type);
    if (!type) return jsonError("invalid_type", 400);
    const review = parseReview(body.review);
    if (!review) return jsonError("invalid_review", 400);

    getRedis(); // 503 before doing any work when storage isn't configured

    try {
      const res = await saveClimb({ userId, grade, type, review });
      return json(res, 201);
    } catch (err) {
      if (err instanceof UserNotFoundError) return jsonError("user_not_found", 404);
      if (err instanceof SaveInProgressError) return jsonError("save_in_progress", 409);
      throw err;
    }
  });
}
