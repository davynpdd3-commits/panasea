import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi.").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
