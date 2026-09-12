import { InventoryManager } from "@/components/inventory/InventoryManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "inventory.manage"));

  return (
    <div>
      <h1 className="mb-4 font-display text-xl text-ink">Inventori</h1>
      <InventoryManager canManage={canManage} />
    </div>
  );
}
