import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createCategorySchema } from "@/lib/validation/category";
import { createCategory, listCategories } from "@/lib/services/category-service";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.view");

  const { searchParams } = new URL(request.url);
  const categories = await listCategories({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as "all" | "active" | "inactive") || "all",
  });
  return ok({ categories });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = createCategorySchema.parse(body);
  const category = await createCategory(input);
  return created({ category });
});
