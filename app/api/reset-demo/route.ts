import { handle, json } from "@/lib/http";
import { resetSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Restores the eight seed climbers and this week's seed counts. Real climbers are left alone. */
async function reset() {
  return handle(async () => {
    const seeded = await resetSeed("aldgate");
    return json({ ok: true, seeded });
  });
}

// GET too, so the demo can be reset from a phone browser.
export const GET = reset;
export const POST = reset;
