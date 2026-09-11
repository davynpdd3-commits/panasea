import { IngredientDetailManager } from "@/components/inventory/IngredientDetailManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function IngredientDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "inventory.manage"));

  return <IngredientDetailManager ingredientId={params.id} canManage={canManage} />;
}
