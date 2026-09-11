import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordMovement } from "@/lib/services/inventory-service";
import type { CreateIngredientInput, UpdateIngredientInput } from "@/lib/validation/ingredient";

interface IngredientListParams {
  search?: string;
  status: "all" | "active" | "inactive" | "low";
  page: number;
  pageSize: number;
}

function withLowFlag<T extends { currentStock: number; minimumStock: number }>(ingredient: T) {
  return { ...ingredient, isLow: ingredient.currentStock <= ingredient.minimumStock };
}

export async function listIngredients(params: IngredientListParams) {
  const baseWhere = {
    ...(params.search
      ? { OR: [{ name: { contains: params.search } }, { sku: { contains: params.search } }] }
      : {}),
    ...(params.status === "active"
      ? { isActive: true }
      : params.status === "inactive"
        ? { isActive: false }
        : {}),
  };

  if (params.status !== "low") {
    const [total, items] = await Promise.all([
      db.ingredient.count({ where: baseWhere }),
      db.ingredient.findMany({
        where: baseWhere,
        include: { unit: true },
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return { items: items.map(withLowFlag), total, page: params.page, pageSize: params.pageSize };
  }

  // Comparing two columns (currentStock <= minimumStock) isn't expressible
  // in a Prisma `where` filter on SQLite. An ingredient list is a single
  // coffeeshop's pantry — realistically dozens of rows, not millions — so
  // filtering in JS after the DB-level search/active filter is a
  // deliberate, scale-appropriate tradeoff, not a shortcut.
  const all = await db.ingredient.findMany({
    where: baseWhere,
    include: { unit: true },
    orderBy: { name: "asc" },
  });
  const low = all.filter((i) => i.currentStock <= i.minimumStock);
  const items = low.slice((params.page - 1) * params.pageSize, params.page * params.pageSize);
  return { items: items.map(withLowFlag), total: low.length, page: params.page, pageSize: params.pageSize };
}

export async function getIngredient(id: string) {
  const ingredient = await db.ingredient.findUnique({
    where: { id },
    include: { unit: true, _count: { select: { movements: true } } },
  });
  if (!ingredient) throw new NotFoundError("Bahan baku");
  return withLowFlag(ingredient);
}

export async function createIngredient(input: CreateIngredientInput, createdById: string) {
  const ingredient = await db.ingredient.create({
    data: {
      name: input.name,
      sku: input.sku || null,
      unitId: input.unitId,
      cost: input.cost ?? null,
      minimumStock: input.minimumStock,
    },
  });

  if (input.initialStock && input.initialStock > 0) {
    const { ingredient: updated } = await recordMovement({
      ingredientId: ingredient.id,
      type: "ADJUSTMENT_IN",
      quantity: input.initialStock,
      referenceType: "INITIAL_STOCK",
      note: "Stok awal saat bahan baku dibuat",
      createdById,
    });
    return updated;
  }

  return db.ingredient.findUniqueOrThrow({ where: { id: ingredient.id }, include: { unit: true } });
}

export async function updateIngredient(id: string, input: UpdateIngredientInput) {
  // currentStock is intentionally never accepted here — the only way to
  // change it is through a movement (recordMovement/adjustStock), so
  // every stock change always has an audit trail.
  return db.ingredient.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
      ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
      ...(input.cost !== undefined ? { cost: input.cost } : {}),
      ...(input.minimumStock !== undefined ? { minimumStock: input.minimumStock } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { unit: true },
  });
}

export async function deleteIngredient(id: string) {
  const ingredient = await db.ingredient.findUnique({
    where: { id },
    include: { _count: { select: { movements: true } } },
  });
  if (ingredient && ingredient._count.movements > 0) {
    throw new ConflictError(
      "Bahan baku ini sudah punya riwayat stok. Nonaktifkan sebagai gantinya, bukan dihapus."
    );
  }
  await db.ingredient.delete({ where: { id } });
}
