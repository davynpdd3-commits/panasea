import type { NextRequest } from "next/server";
import { apiHandler, created } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createVariantSchema } from "@/lib/validation/product";
import { createVariant } from "@/lib/services/product-service";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = createVariantSchema.parse(body);
  const variant = await createVariant(context.params.id, input);
  return created({ variant });
});
