import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { listUnits } from "@/lib/services/unit-service";

export const GET = apiHandler(async () => {
  const session = await requireSession();
  requirePermission(session, "inventory.view");

  const units = await listUnits();
  return ok({ units });
});
