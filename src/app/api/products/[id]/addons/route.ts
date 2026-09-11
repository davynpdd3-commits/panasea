import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { attachAddonsSchema } from "@/lib/validation/product";
import { attachAddons } from "@/lib/services/product-service";

export const POST = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = attachAddonsSchema.parse(body);
  const product = await attachAddons(context.params.id, input.addonIds);
  return ok({ product });
});
