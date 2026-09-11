import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { adjustStockSchema } from "@/lib/validation/inventory";
import { adjustStock } from "@/lib/services/inventory-service";

export const POST = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "inventory.manage");

  const body = await request.json();
  const input = adjustStockSchema.parse(body);
  const result = await adjustStock(context.params.id, input, session.user.id);
  return ok(result);
});
