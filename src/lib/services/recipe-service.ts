import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { CreateRecipeInput, UpdateRecipeInput } from "@/lib/validation/recipe";

export interface RecipeItemWithIngredient {
  id?: string;
  quantity: number;
  ingredient: {
    id: string;
    name: string;
    cost?: number | null;
    unit: {
      id: string;
      name: string;
      symbol: string;
    };
  };
}

/**
 * Calculates HPP (Harga Pokok Penjualan) for a given recipe.
 * HPP = Σ (quantity of ingredient in recipe) * (cost of that ingredient)
 *
 * If an ingredient's cost is null/undefined, it is treated as 0 in the calculation.
 */
export function calculateHPP(
  items: Array<{ quantity: number; ingredient: { cost?: number | null } }>
): number {
  let total = 0;
  for (const item of items) {
    const cost = item.ingredient.cost ?? 0;
    total += item.quantity * cost;
  }
  return Math.round(total * 100) / 100;
}

interface ListRecipesParams {
  search?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}

export async function listRecipes(params: ListRecipesParams = {}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;

  const where = {
    ...(params.productId ? { productId: params.productId } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search } },
            { product: { name: { contains: params.search } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    db.recipe.count({ where }),
    db.recipe.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, price: true } },
        variant: { select: { id: true, name: true, price: true } },
        items: {
          include: {
            ingredient: {
              include: {
                unit: { select: { id: true, name: true, symbol: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const recipesWithHPP = items.map((recipe) => ({
    ...recipe,
    hpp: calculateHPP(recipe.items),
  }));

  return { items: recipesWithHPP, total, page, pageSize };
}

export async function getRecipe(id: string) {
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          variants: { select: { id: true, name: true, price: true } },
        },
      },
      variant: { select: { id: true, name: true, price: true } },
      items: {
        include: {
          ingredient: {
            include: {
              unit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      },
    },
  });

  if (!recipe) {
    throw new NotFoundError("Resep");
  }

  return {
    ...recipe,
    hpp: calculateHPP(recipe.items),
  };
}

export async function createRecipe(input: CreateRecipeInput) {
  const variantId = input.variantId || null;

  // Check unique constraint @@unique([productId, variantId])
  const existing = await db.recipe.findFirst({
    where: {
      productId: input.productId,
      variantId,
    },
  });

  if (existing) {
    throw new ConflictError("Resep untuk produk dan varian ini sudah dibuat.");
  }

  const recipe = await db.recipe.create({
    data: {
      productId: input.productId,
      variantId,
      name: input.name,
      isActive: input.isActive ?? true,
      items: {
        create: input.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      product: { select: { id: true, name: true, price: true } },
      variant: { select: { id: true, name: true, price: true } },
      items: {
        include: {
          ingredient: {
            include: {
              unit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      },
    },
  });

  return {
    ...recipe,
    hpp: calculateHPP(recipe.items),
  };
}

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  const current = await db.recipe.findUnique({ where: { id } });
  if (!current) {
    throw new NotFoundError("Resep");
  }

  const productId = input.productId ?? current.productId;
  const variantId = input.variantId !== undefined ? (input.variantId || null) : current.variantId;

  // If productId or variantId changed, verify uniqueness
  if (productId !== current.productId || variantId !== current.variantId) {
    const existing = await db.recipe.findFirst({
      where: {
        productId,
        variantId,
        NOT: { id },
      },
    });
    if (existing) {
      throw new ConflictError("Resep untuk produk dan varian ini sudah dibuat.");
    }
  }

  return db.$transaction(async (tx) => {
    // If items are provided, replace existing items
    if (input.items) {
      await tx.recipeItem.deleteMany({ where: { recipeId: id } });
      await tx.recipeItem.createMany({
        data: input.items.map((it) => ({
          recipeId: id,
          ingredientId: it.ingredientId,
          quantity: it.quantity,
        })),
      });
    }

    const updated = await tx.recipe.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.variantId !== undefined ? { variantId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        product: { select: { id: true, name: true, price: true } },
        variant: { select: { id: true, name: true, price: true } },
        items: {
          include: {
            ingredient: {
              include: {
                unit: { select: { id: true, name: true, symbol: true } },
              },
            },
          },
        },
      },
    });

    return {
      ...updated,
      hpp: calculateHPP(updated.items),
    };
  });
}

export async function deleteRecipe(id: string) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) {
    throw new NotFoundError("Resep");
  }

  // Delete recipe (RecipeItem has onDelete: Cascade)
  await db.recipe.delete({ where: { id } });
  return { deleted: true };
}
