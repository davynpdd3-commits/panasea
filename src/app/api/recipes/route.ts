import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createRecipeSchema, recipeListQuerySchema } from "@/lib/validation/recipe";
import { createRecipe, listRecipes } from "@/lib/services/recipe-service";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "recipes.view");

  const { searchParams } = new URL(request.url);
  const query = recipeListQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await listRecipes(query);
  return ok(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "recipes.manage");

  const body = await request.json();
  const input = createRecipeSchema.parse(body);
  const recipe = await createRecipe(input);
  return created({ recipe });
});
