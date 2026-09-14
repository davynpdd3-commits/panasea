import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateSupplierSchema } from "@/lib/validation/supplier";
import { deleteSupplier, getSupplier, updateSupplier } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "purchasing.view");

  const supplier = await getSupplier(context.params.id);
  return ok({ supplier });
});

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "purchasing.manage");

  const body = await request.json();
  const input = updateSupplierSchema.parse(body);
  const supplier = await updateSupplier(context.params.id, input);
  return ok({ supplier });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "purchasing.manage");

  await deleteSupplier(context.params.id);
  return ok({ deleted: true });
});
