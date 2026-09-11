import { RecipesManager } from "@/components/recipes/RecipesManager";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function RecipesPage() {
  const session = await getCurrentSession();
  const canManage = Boolean(session && hasPermission(session, "recipes.manage"));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 font-display text-xl text-ink">Resep & HPP</h1>
      <RecipesManager canManage={canManage} />
    </div>
  );
}
