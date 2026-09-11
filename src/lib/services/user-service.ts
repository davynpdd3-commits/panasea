import { db } from "@/lib/db";

/**
 * Basic user management foundation. Deliberately minimal — full
 * create/update/deactivate UI is a later batch's feature, not BATCH 2's
 * job. What matters here is that user data is only ever read through a
 * service function that excludes passwordHash, so no route handler can
 * accidentally leak it.
 */
export async function listUsers() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    role: u.role.name,
  }));
}
