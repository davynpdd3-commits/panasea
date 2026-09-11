"use client";

import { usePos, type ProductWithRelations } from "./PosContext";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils";
import { ProductOptionsModal } from "./ProductOptionsModal";

export function PosCatalog() {
  const { categories, products, activeCategory, setActiveCategory, searchQuery, setSearchQuery, addToCart } = usePos();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);

  const filteredProducts = products.filter((p) => {
    if (activeCategory && p.categoryId !== activeCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleProductClick = (product: ProductWithRelations) => {
    if (product.variants.length > 0 || product.addons.length > 0) {
      setSelectedProduct(product);
    } else {
      addToCart({
        productId: product.id,
        quantity: 1,
        addons: [],
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header / Search */}
      <div className="p-4 md:p-6 border-b border-border bg-surface shrink-0 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl text-ink hidden sm:block">Katalog Produk</h2>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input 
            placeholder="Cari produk..." 
            className="pl-9 bg-cream/50" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-border bg-surface/50 overflow-x-auto shrink-0">
        <div className="flex p-3 gap-2 min-w-max">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === null 
                ? "bg-coffee-600 text-surface" 
                : "bg-transparent text-ink-subtle hover:bg-cream"
            }`}
            onClick={() => setActiveCategory(null)}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id 
                  ? "bg-coffee-600 text-surface" 
                  : "bg-transparent text-ink-subtle hover:bg-cream"
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-cream">
        {filteredProducts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-ink-muted">
            Produk tidak ditemukan.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="group flex flex-col text-left overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-coffee-300 hover:shadow-sm"
              >
                <div className="flex-1 p-4">
                  <h3 className="font-medium text-ink group-hover:text-coffee-600 line-clamp-2">{product.name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {product.variants.length > 0 ? "Mulai dari " : ""}
                    {formatRupiah(
                      product.variants.length > 0 
                        ? Math.min(...product.variants.map((v) => v.price)) 
                        : product.price
                    )}
                  </p>
                </div>
                {(product.variants.length > 0 || product.addons.length > 0) && (
                  <div className="bg-cream/50 px-4 py-2 text-xs text-ink-subtle border-t border-border group-hover:bg-coffee-50 group-hover:text-coffee-700 transition-colors">
                    Pilih Opsi &rarr;
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Options Modal */}
      {selectedProduct && (
        <ProductOptionsModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
