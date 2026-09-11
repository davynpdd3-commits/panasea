import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupplierSchema } from "@/lib/validation/supplier";
import { createSupplier, listSuppliers } from "@/lib/services/supplier-service";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "purchasing.view");

  const { searchParams } = new URL(request.url);
  const suppliers = await listSuppliers({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as "all" | "active" | "inactive") || "all",
  });
  return ok({ suppliers });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "purchasing.manage");

  const body = await request.json();
  const input = createSupplierSchema.parse(body);
  const supplier = await createSupplier(input);
  return created({ supplier });
});
