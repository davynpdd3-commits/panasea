import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateRecipeSchema } from "@/lib/validation/recipe";
import { deleteRecipe, getRecipe, updateRecipe } from "@/lib/services/recipe-service";

export const GET = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "recipes.view");

  const recipe = await getRecipe(context.params.id);
  return ok({ recipe });
});

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "recipes.manage");

  const body = await request.json();
  const input = updateRecipeSchema.parse(body);
  const recipe = await updateRecipe(context.params.id, input);
  return ok({ recipe });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "recipes.manage");

  await deleteRecipe(context.params.id);
  return ok({ deleted: true });
});
