import { z } from "zod";
import { idSchema, positiveQuantitySchema } from "./common";

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1, "Nama bahan wajib diisi.").max(120),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  unitId: idSchema,
  cost: z.number().nonnegative("Biaya tidak boleh bernilai negatif.").optional().nullable(),
  minimumStock: z.number().nonnegative("Tidak boleh bernilai negatif.").default(0),
  // Optional starting stock — becomes an ADJUSTMENT_IN movement at creation
  // time (see ingredient-service.ts) so it still goes through the ledger,
  // never a raw field write.
  initialStock: positiveQuantitySchema.optional(),
});

export const updateIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  unitId: idSchema.optional(),
  cost: z.number().nonnegative("Biaya tidak boleh bernilai negatif.").optional().nullable(),
  minimumStock: z.number().nonnegative("Tidak boleh bernilai negatif.").optional(),
  isActive: z.boolean().optional(),
});

export const ingredientListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive", "low"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
