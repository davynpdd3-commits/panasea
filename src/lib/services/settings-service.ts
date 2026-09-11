import { db } from '@/lib/db';
import type { StoreSetting } from '@prisma/client';

/**
 * Get the store settings. If no row exists, returns default settings.
 */
export async function getSettings(): Promise<StoreSetting> {
  let setting = await db.storeSetting.findFirst();
  if (!setting) {
    // Return defaults (prisma defaults will apply on creation, but here we construct object)
    setting = await db.storeSetting.create({
      data: {},
    });
  }
  return setting;
}

/**
 * Update store settings. Creates the row if it does not exist.
 * @param data Partial settings object
 */
export async function updateSettings(
  data: Partial<Omit<StoreSetting, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<StoreSetting> {
  const existing = await db.storeSetting.findFirst();
  if (existing) {
    return await db.storeSetting.update({
      where: { id: existing.id },
      data,
    });
  }
  // Create with provided data, letting defaults fill missing fields
  return await db.storeSetting.create({
    data: data as any,
  });
}
