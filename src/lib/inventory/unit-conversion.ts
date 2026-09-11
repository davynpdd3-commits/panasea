import { ValidationError } from "@/lib/errors";

/**
 * Unit conversion.
 *
 * Every Unit row belongs to a "type" (WEIGHT, VOLUME, COUNT) and has a
 * `conversionToBase` factor relative to that type's base unit (Gram for
 * WEIGHT, Milliliter for VOLUME, Pcs for COUNT — see prisma/seed.ts). This
 * file is the ONLY place that does the arithmetic, so a purchasing module
 * later that needs "5 kg -> how many g" never re-derives the ratio itself.
 */

export interface UnitLike {
  id: string;
  type: string;
  conversionToBase: number;
}

/** Converts an amount from one unit to another unit of the SAME type. */
export function convertQuantity(
  amount: number,
  fromUnit: UnitLike,
  toUnit: UnitLike
): number {
  if (fromUnit.type !== toUnit.type) {
    throw new ValidationError(
      `Tidak bisa mengonversi satuan ${fromUnit.type} ke ${toUnit.type}.`
    );
  }
  const baseAmount = amount * fromUnit.conversionToBase;
  return baseAmount / toUnit.conversionToBase;
}

/** Formats a quantity with its unit symbol, e.g. (1.2, "kg") -> "1.2 kg". */
export function formatQuantity(amount: number, unitSymbol: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded} ${unitSymbol}`;
}
