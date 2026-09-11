import { z } from "zod";
import { moneySchema } from "./common";

export const createAddonSchema = z.object({
  name: z.string().trim().min(1, "Nama add-on wajib diisi.").max(80),
  price: moneySchema,
});

export const updateAddonSchema = createAddonSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAddonInput = z.infer<typeof createAddonSchema>;
export type UpdateAddonInput = z.infer<typeof updateAddonSchema>;
