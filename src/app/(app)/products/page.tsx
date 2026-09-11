import { ProductsSubNav } from "@/components/products/ProductsSubNav";
import { ProductsManager } from "@/components/products/ProductsManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function ProductsPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "products.manage"));

  return (
    <div>
      <ProductsSubNav />
      <h1 className="mb-4 font-display text-xl text-ink">Produk</h1>
      <ProductsManager canManage={canManage} />
    </div>
  );
}
