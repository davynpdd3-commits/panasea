import { ProductDetailManager } from "@/components/products/ProductDetailManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "products.manage"));

  return <ProductDetailManager productId={params.id} canManage={canManage} />;
}
