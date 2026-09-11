import { db } from "@/lib/db";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/lib/validation/supplier";

export async function listSuppliers(params: { search?: string; status?: "all" | "active" | "inactive" }) {
  return db.supplier.findMany({
    where: {
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { contactPerson: { contains: params.search } },
              { phone: { contains: params.search } },
            ],
          }
        : {}),
      ...(params.status === "active"
        ? { isActive: true }
        : params.status === "inactive"
          ? { isActive: false }
          : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  return db.supplier.findUniqueOrThrow({ where: { id } });
}

export async function createSupplier(input: CreateSupplierInput) {
  return db.supplier.create({
    data: {
      name: input.name,
      contactPerson: input.contactPerson || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
    },
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  return db.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteSupplier(id: string) {
  // No purchase orders exist yet (later batch), so nothing references a
  // supplier — safe to hard-delete. Missing id -> Prisma P2025 -> 404.
  await db.supplier.delete({ where: { id } });
}
