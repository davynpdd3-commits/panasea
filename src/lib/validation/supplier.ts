import { z } from "zod";

// Only `name` is required — most supplier contact fields are legitimately
// optional in real coffee-shop operations (per BATCH 3 brief: don't force
// fields that are optional in practice).
export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Nama supplier wajib diisi.").max(120),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Format email tidak valid.").optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
