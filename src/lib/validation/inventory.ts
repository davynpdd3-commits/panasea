import { z } from "zod";
import { positiveQuantitySchema } from "./common";

export const ADJUSTMENT_REASONS = [
  "DAMAGED",
  "EXPIRED",
  "WASTE",
  "COUNTING_CORRECTION",
  "SYSTEM_CORRECTION",
] as const;

export const adjustStockSchema = z.object({
  // Positive number always; direction decided by `direction` so the form
  // never has to explain "type a negative number to reduce stock".
  quantity: positiveQuantitySchema,
  direction: z.enum(["IN", "OUT"]),
  reason: z.enum(ADJUSTMENT_REASONS),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const movementHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
