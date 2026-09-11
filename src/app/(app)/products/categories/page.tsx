import { ProductsSubNav } from "@/components/products/ProductsSubNav";
import { CategoriesManager } from "@/components/products/CategoriesManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function CategoriesPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "products.manage"));

  return (
    <div>
      <ProductsSubNav />
      <h1 className="mb-4 font-display text-xl text-ink">Kategori</h1>
      <CategoriesManager canManage={canManage} />
    </div>
  );
}
