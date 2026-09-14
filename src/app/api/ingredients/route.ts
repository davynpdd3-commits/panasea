import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createIngredientSchema, ingredientListQuerySchema } from "@/lib/validation/ingredient";
import { createIngredient, listIngredients } from "@/lib/services/ingredient-service";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "inventory.view");

  const { searchParams } = new URL(request.url);
  const query = ingredientListQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await listIngredients(query);
  return ok(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "inventory.manage");

  const body = await request.json();
  const input = createIngredientSchema.parse(body);
  const ingredient = await createIngredient(input, session.user.id);
  return created({ ingredient });
});
