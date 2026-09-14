import { ProductsSubNav } from "@/components/products/ProductsSubNav";
import { AddonsManager } from "@/components/products/AddonsManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AddonsPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "products.manage"));

  return (
    <div>
      <ProductsSubNav />
      <h1 className="mb-4 font-display text-xl text-ink">Add-on</h1>
      <AddonsManager canManage={canManage} />
    </div>
  );
}
