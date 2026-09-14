import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { listUsers } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 *
 * Requires "employees.view", which only the OWNER role is seeded with.
 * A CASHIER token (or no token at all) gets rejected here regardless of
 * what the frontend does or doesn't show in its navigation — this is the
 * concrete example the BATCH 2 brief asks for: authorization enforced on
 * the backend, not just hidden in the UI.
 */
export const GET = apiHandler(async () => {
  const session = await requireSession();
  requirePermission(session, "employees.view");

  const users = await listUsers();
  return ok({ users });
});
