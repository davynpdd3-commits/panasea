import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createProductSchema, productListQuerySchema } from "@/lib/validation/product";
import { createProduct, listProducts } from "@/lib/services/product-service";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.view");

  const { searchParams } = new URL(request.url);
  const query = productListQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await listProducts({
    search: query.search,
    categoryId: query.categoryId,
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
  });
  return ok(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = createProductSchema.parse(body);
  const product = await createProduct(input);
  return created({ product });
});
