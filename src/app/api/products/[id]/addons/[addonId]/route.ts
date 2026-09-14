import type { NextRequest } from "next/server";
import { apiHandler, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { detachAddon } from "@/lib/services/product-service";

export const dynamic = "force-dynamic";

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: { id: string; addonId: string } }) => {
    const session = await requireSession();
    requirePermission(session, "products.manage");

    await detachAddon(context.params.id, context.params.addonId);
    return ok({ deleted: true });
  }
);
