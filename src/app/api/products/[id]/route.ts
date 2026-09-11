import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateProductSchema } from "@/lib/validation/product";
import { deleteProduct, getProduct, updateProduct } from "@/lib/services/product-service";

export const GET = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.view");

  const product = await getProduct(context.params.id);
  return ok({ product });
});

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = updateProductSchema.parse(body);
  const product = await updateProduct(context.params.id, input);
  return ok({ product });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  await deleteProduct(context.params.id);
  return ok({ deleted: true });
});
