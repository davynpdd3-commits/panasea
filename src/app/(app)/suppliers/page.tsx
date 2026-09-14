import { SuppliersManager } from "@/components/suppliers/SuppliersManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "purchasing.manage"));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 font-display text-xl text-ink">Pemasok</h1>
      <SuppliersManager canManage={canManage} />
    </div>
  );
}
