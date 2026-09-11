import { db } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validation/category";

export async function listCategories(params: { search?: string; status?: "all" | "active" | "inactive" }) {
  return db.category.findMany({
    where: {
      ...(params.search ? { name: { contains: params.search } } : {}),
      ...(params.status === "active"
        ? { isActive: true }
        : params.status === "inactive"
          ? { isActive: false }
          : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  // Uniqueness is enforced by the DB's unique constraint on `name` — a
  // duplicate throws Prisma P2002, mapped centrally to a friendly 422 by
  // toErrorResponse(), so this doesn't need its own pre-check query.
  return db.category.create({
    data: {
      name: input.name,
      description: input.description || null,
      icon: input.icon || null,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  return db.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.icon !== undefined ? { icon: input.icon || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteCategory(id: string) {
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (category && category._count.products > 0) {
    throw new ConflictError(
      "Kategori masih memiliki produk. Nonaktifkan kategori ini, atau pindahkan produknya terlebih dahulu."
    );
  }
  // If the category doesn't exist at all, let Prisma's P2025 (mapped
  // centrally to 404) handle it rather than duplicating that check here.
  await db.category.delete({ where: { id } });
}
