import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateVariantSchema } from "@/lib/validation/product";
import { deleteVariant, updateVariant } from "@/lib/services/product-service";

export const dynamic = "force-dynamic";

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: { id: string; variantId: string } }) => {
    const session = await requireSession();
    requirePermission(session, "products.manage");

    const body = await request.json();
    const input = updateVariantSchema.parse(body);
    const variant = await updateVariant(context.params.id, context.params.variantId, input);
    return ok({ variant });
  }
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: { id: string; variantId: string } }) => {
    const session = await requireSession();
    requirePermission(session, "products.manage");

    await deleteVariant(context.params.id, context.params.variantId);
    return ok({ deleted: true });
  }
);
