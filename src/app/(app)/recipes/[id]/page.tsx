import { RecipeDetailManager } from "@/components/recipes/RecipeDetailManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "recipes.manage"));

  return <RecipeDetailManager recipeId={params.id} canManage={canManage} />;
}
