"use client";

import { PosProvider, type ProductWithRelations } from "./PosContext";
import { PosCatalog } from "./PosCatalog";
import { PosCart } from "./PosCart";
import type { Category, Addon, Order } from "@prisma/client";

interface PosLayoutProps {
  categories: Category[];
  products: ProductWithRelations[];
  addons: Addon[];
  initialHeldOrders: any[];
}

export function PosLayout({ categories, products, addons, initialHeldOrders }: PosLayoutProps) {
  return (
    <PosProvider categories={categories} products={products} addons={addons}>
      <div className="flex h-full w-full flex-col md:flex-row overflow-hidden bg-cream">
        <div className="flex-1 flex flex-col min-w-0 h-full border-r border-border">
          <PosCatalog />
        </div>
        <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 h-full flex flex-col bg-surface shadow-[-4px_0_12px_rgba(0,0,0,0.02)] z-10">
          <PosCart initialHeldOrders={initialHeldOrders} />
        </div>
      </div>
    </PosProvider>
  );
}
