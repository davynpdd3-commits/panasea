import { db } from "@/lib/db";
import { apiHandler, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Proves the foundation actually works end-to-end: the API layer,
 * error handling, and the database connection (via a raw query, since
 * no business tables exist until BATCH 2).
 */
export const GET = apiHandler(async () => {
  const startedAt = Date.now();
  await db.$queryRaw`SELECT 1`;

  return ok({
    status: "ok",
    database: "connected",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
});
