import { z } from "zod";
import { idSchema, positiveQuantitySchema } from "./common";

export const recipeItemInputSchema = z.object({
  ingredientId: idSchema,
  quantity: positiveQuantitySchema,
});

export const createRecipeSchema = z.object({
  productId: idSchema,
  variantId: idSchema.optional().nullable(),
  name: z.string().trim().min(1, "Nama resep wajib diisi.").max(120),
  isActive: z.boolean().optional().default(true),
  items: z.array(recipeItemInputSchema).min(1, "Resep minimal harus memiliki 1 bahan baku."),
});

export const updateRecipeSchema = z.object({
  productId: idSchema.optional(),
  variantId: idSchema.optional().nullable(),
  name: z.string().trim().min(1, "Nama resep wajib diisi.").max(120).optional(),
  isActive: z.boolean().optional(),
  items: z.array(recipeItemInputSchema).min(1, "Resep minimal harus memiliki 1 bahan baku.").optional(),
});

export const recipeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  productId: idSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type RecipeItemInput = z.infer<typeof recipeItemInputSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type RecipeListQuery = z.infer<typeof recipeListQuerySchema>;
