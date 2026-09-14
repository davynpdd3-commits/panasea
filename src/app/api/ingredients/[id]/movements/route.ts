import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { movementHistoryQuerySchema } from "@/lib/validation/inventory";
import { getMovementHistory } from "@/lib/services/inventory-service";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "inventory.view");

  const { searchParams } = new URL(request.url);
  const query = movementHistoryQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await getMovementHistory(context.params.id, query.page, query.pageSize);
  return ok(result);
});
