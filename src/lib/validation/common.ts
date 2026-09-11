import { z } from "zod";

/**
 * Reusable validation primitives for feature modules built in later
 * batches (products, transactions, inventory, ...). Keeping these here
 * avoids every module re-inventing "is this a positive integer id" or
 * "is this money value valid" slightly differently.
 */

/** A database id — cuid/uuid style string identifier. */
export const idSchema = z.string().min(1, "ID tidak valid.");

/** Non-negative integer, e.g. stock quantity, item count. */
export const nonNegativeIntSchema = z
  .number()
  .int("Harus berupa bilangan bulat.")
  .nonnegative("Tidak boleh bernilai negatif.");

/**
 * Money values are stored as integers in the smallest currency unit
 * (Rupiah has no subunit in practice, so this is just whole Rupiah) to
 * avoid floating point rounding errors in financial calculations.
 */
export const moneySchema = z
  .number()
  .int("Nilai uang harus bilangan bulat (Rupiah).")
  .nonnegative("Nilai uang tidak boleh negatif.");

/**
 * Stock/ingredient quantities, unlike money, are legitimately fractional
 * (1.2 kg of coffee beans). Must be strictly positive — a movement of
 * zero doesn't mean anything.
 */
export const positiveQuantitySchema = z
  .number()
  .positive("Jumlah harus lebih besar dari 0.");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
