import { db } from "@/lib/db";

/**
 * Units are foundational reference data (seeded), not something owners
 * manage through a CRUD screen in this batch — every ingredient form
 * just needs to read the list to populate a dropdown.
 */
export async function listUnits() {
  return db.unit.findMany({ orderBy: [{ type: "asc" }, { conversionToBase: "asc" }] });
}
