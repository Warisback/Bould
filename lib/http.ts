/** Server only. JSON responses and error mapping shared by the API routes. */
import { StorageUnavailableError } from "./redis";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}

function isStorageError(err: unknown): boolean {
  if (err instanceof StorageUnavailableError) return true;
  if (!(err instanceof Error)) return false;
  // Upstash client errors, or the REST endpoint being unreachable.
  return err.name === "UpstashError" || /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(err.message);
}

/** Runs a handler and turns thrown errors into JSON: 503 when Redis is missing or down, else 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (isStorageError(err)) {
      if (!(err instanceof StorageUnavailableError)) console.error("[storage]", err);
      return jsonError("storage_unavailable", 503);
    }
    console.error("[api]", err);
    return jsonError("server_error", 500);
  }
}

/** Parses a JSON body, or returns null. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
