import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ADJUSTMENT_REASONS, type AdjustStockInput } from "@/lib/validation/inventory";
import type { Prisma } from "@prisma/client";

type MovementType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

const INCREASING_TYPES = new Set<MovementType>(["STOCK_IN", "ADJUSTMENT_IN"]);

interface RecordMovementInput {
  ingredientId: string;
  type: MovementType;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  note?: string | null;
  createdById: string;
}

/**
 * The ONLY function that writes an InventoryMovement row and mutates
 * Ingredient.currentStock — always together, inside one DB transaction,
 * so it's impossible for a movement to be recorded without the stock
 * actually changing, or vice versa (BATCH 3 brief section 9).
 *
 * Ready to be called with type "PURCHASE"/"SALE"/etc. once those flows
 * exist in a later batch — the ledger mechanics don't need to change.
 */
export async function recordMovement(input: RecordMovementInput) {
  return db.$transaction(async (tx) => {
    return recordMovementInTx(tx, input);
  });
}

/**
 * Same as recordMovement but accepts an existing Prisma transaction client,
 * so it can be composed inside a larger atomic operation (e.g. payment +
 * order completion + inventory deduction all in one transaction).
 */
export async function recordMovementInTx(
  tx: Prisma.TransactionClient,
  input: RecordMovementInput
) {
  const ingredient = await tx.ingredient.findUnique({
    where: { id: input.ingredientId },
    include: { unit: true },
  });
  if (!ingredient) throw new NotFoundError("Bahan baku");

  const delta = INCREASING_TYPES.has(input.type) ? input.quantity : -input.quantity;
  const nextStock = ingredient.currentStock + delta;

  if (nextStock < 0) {
    throw new ValidationError(
      `Stok tidak cukup. Sisa stok ${ingredient.currentStock} ${ingredient.unit.symbol}, tidak bisa dikurangi ${input.quantity} ${ingredient.unit.symbol}.`
    );
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      ingredientId: input.ingredientId,
      type: input.type,
      quantity: input.quantity,
      unitId: ingredient.unitId,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdById: input.createdById,
    },
  });

  const updatedIngredient = await tx.ingredient.update({
    where: { id: input.ingredientId },
    data: { currentStock: nextStock },
    include: { unit: true },
  });

  return { movement, ingredient: updatedIngredient };
}

const REASON_LABELS: Record<(typeof ADJUSTMENT_REASONS)[number], string> = {
  DAMAGED: "Rusak",
  EXPIRED: "Kedaluwarsa",
  WASTE: "Terbuang",
  COUNTING_CORRECTION: "Koreksi hitung fisik",
  SYSTEM_CORRECTION: "Koreksi sistem",
};

export async function adjustStock(ingredientId: string, input: AdjustStockInput, userId: string) {
  const type: MovementType = input.direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
  const reasonLabel = REASON_LABELS[input.reason];
  const note = input.note ? `${reasonLabel} — ${input.note}` : reasonLabel;

  return recordMovement({
    ingredientId,
    type,
    quantity: input.quantity,
    referenceType: "ADJUSTMENT",
    note,
    createdById: userId,
  });
}

export async function getMovementHistory(ingredientId: string, page: number, pageSize: number) {
  const [total, items] = await Promise.all([
    db.inventoryMovement.count({ where: { ingredientId } }),
    db.inventoryMovement.findMany({
      where: { ingredientId },
      include: { unit: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize };
}

/** Used by the main dashboard for a quick "N bahan stok menipis" summary. */
export async function countLowStock() {
  const ingredients = await db.ingredient.findMany({
    where: { isActive: true },
    select: { currentStock: true, minimumStock: true },
  });
  return ingredients.filter((i) => i.currentStock <= i.minimumStock).length;
}

// ─── Recipe-based inventory deduction ───────────

interface OrderItemForDeduction {
  productId: string;
  variantId: string | null;
  quantity: number;
}

/**
 * Deducts ingredient stock for every item in an order, using the recipe
 * system: OrderItem → Product → Recipe → RecipeItem → Ingredient.
 *
 * Must be called inside a Prisma interactive transaction so that if any
 * ingredient is out of stock, the entire payment + completion + deduction
 * rolls back atomically.
 *
 * Items whose product has no recipe are silently skipped (not every product
 * needs recipes — e.g. packaged goods sold as-is).
 */
export async function deductInventoryForOrderInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: OrderItemForDeduction[],
  cashierId: string
) {
  for (const item of items) {
    // Try variant-specific recipe first, then fall back to base product recipe
    let recipe = item.variantId
      ? await tx.recipe.findUnique({
          where: {
            productId_variantId: {
              productId: item.productId,
              variantId: item.variantId,
            },
          },
          include: { items: { include: { ingredient: { include: { unit: true } } } } },
        })
      : null;

    if (!recipe) {
      // Fall back to base product recipe (variantId = null)
      recipe = await tx.recipe.findFirst({
        where: {
          productId: item.productId,
          variantId: null,
          isActive: true,
        },
        include: { items: { include: { ingredient: { include: { unit: true } } } } },
      });
    }

    // No recipe for this product — skip (e.g. packaged goods)
    if (!recipe || !recipe.isActive) continue;

    for (const recipeItem of recipe.items) {
      const deductQty = recipeItem.quantity * item.quantity;

      await recordMovementInTx(tx, {
        ingredientId: recipeItem.ingredientId,
        type: "STOCK_OUT",
        quantity: deductQty,
        referenceType: "SALE",
        referenceId: orderId,
        note: `Penjualan pesanan`,
        createdById: cashierId,
      });
    }
  }
}
