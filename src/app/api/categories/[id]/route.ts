import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateCategorySchema } from "@/lib/validation/category";
import { deleteCategory, updateCategory } from "@/lib/services/category-service";

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = updateCategorySchema.parse(body);
  const category = await updateCategory(context.params.id, input);
  return ok({ category });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  await deleteCategory(context.params.id);
  return ok({ deleted: true });
});
