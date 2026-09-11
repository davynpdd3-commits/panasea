import { z } from "zod";
import { idSchema, moneySchema } from "./common";

export const createProductSchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(1, "Nama produk wajib diisi.").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  price: moneySchema,
  costPrice: moneySchema.optional(),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createVariantSchema = z.object({
  name: z.string().trim().min(1, "Nama variant wajib diisi.").max(60),
  price: moneySchema,
  sku: z.string().trim().max(60).optional().or(z.literal("")),
});

export const updateVariantSchema = createVariantSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const attachAddonsSchema = z.object({
  addonIds: z.array(idSchema).min(1, "Pilih minimal satu add-on."),
});

export const productListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: idSchema.optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
