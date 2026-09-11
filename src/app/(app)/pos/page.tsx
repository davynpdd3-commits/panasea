import { db } from "@/lib/db";
import { PosLayout } from "@/components/pos/PosLayout";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function PosPage() {
  const session = await requireSession();

  if (!hasPermission(session, "pos.access")) {
    redirect("/");
  }

  const [categories, products, addons, heldOrders] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        addons: {
          include: { addon: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.addon.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    db.order.findMany({
      where: { status: "HELD" },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
            addons: { include: { addon: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="-m-4 flex h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] flex-col md:-m-8 md:h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
      <PosLayout
        categories={categories}
        products={products}
        addons={addons}
        initialHeldOrders={heldOrders}
      />
    </div>
  );
}
