import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateIngredientSchema } from "@/lib/validation/ingredient";
import { deleteIngredient, getIngredient, updateIngredient } from "@/lib/services/ingredient-service";

export const GET = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "inventory.view");

  const ingredient = await getIngredient(context.params.id);
  return ok({ ingredient });
});

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "inventory.manage");

  const body = await request.json();
  const input = updateIngredientSchema.parse(body);
  const ingredient = await updateIngredient(context.params.id, input);
  return ok({ ingredient });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "inventory.manage");

  await deleteIngredient(context.params.id);
  return ok({ deleted: true });
});
