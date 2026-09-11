import { db } from "@/lib/db";
import type { CreateAddonInput, UpdateAddonInput } from "@/lib/validation/addon";

export async function listAddons(params: { search?: string; status?: "all" | "active" | "inactive" }) {
  return db.addon.findMany({
    where: {
      ...(params.search ? { name: { contains: params.search } } : {}),
      ...(params.status === "active"
        ? { isActive: true }
        : params.status === "inactive"
          ? { isActive: false }
          : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function createAddon(input: CreateAddonInput) {
  return db.addon.create({ data: { name: input.name, price: input.price } });
}

export async function updateAddon(id: string, input: UpdateAddonInput) {
  return db.addon.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteAddon(id: string) {
  // Safe to hard-delete: ProductAddon is just a link table (cascades),
  // and no order/transaction history references addons yet.
  await db.addon.delete({ where: { id } });
}
