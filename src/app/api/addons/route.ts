import type { NextRequest } from "next/server";
import { apiHandler, created, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { createAddonSchema } from "@/lib/validation/addon";
import { createAddon, listAddons } from "@/lib/services/addon-service";

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.view");

  const { searchParams } = new URL(request.url);
  const addons = await listAddons({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as "all" | "active" | "inactive") || "all",
  });
  return ok({ addons });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "products.manage");

  const body = await request.json();
  const input = createAddonSchema.parse(body);
  const addon = await createAddon(input);
  return created({ addon });
});
