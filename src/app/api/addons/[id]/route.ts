import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { updateAddonSchema } from "@/lib/validation/addon";
import { deleteAddon, updateAddon } from "@/lib/services/addon-service";

export const PATCH = apiHandler(async (request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = updateAddonSchema.parse(body);
  const addon = await updateAddon(context.params.id, input);
  return ok({ addon });
});

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: { id: string } }) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  await deleteAddon(context.params.id);
  return ok({ deleted: true });
});
