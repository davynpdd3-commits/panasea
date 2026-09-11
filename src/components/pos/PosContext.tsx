"use client";

import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import type { Product, Category, Addon, ProductVariant, ProductAddon } from "@prisma/client";

export type ProductWithRelations = Product & {
  variants: ProductVariant[];
  addons: (ProductAddon & { addon: Addon })[];
};

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  addons: string[];
}

interface PosContextType {
  categories: Category[];
  products: ProductWithRelations[];
  addons: Addon[];
  
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  cartTotal: number;
  cartSubtotal: number;
  
  getProduct: (id: string) => ProductWithRelations | undefined;
  getVariant: (productId: string, variantId: string) => ProductVariant | undefined;
  getAddon: (id: string) => Addon | undefined;
  
  heldOrderId: string | null;
  setHeldOrderId: (id: string | null) => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({
  children,
  categories,
  products,
  addons,
}: {
  children: ReactNode;
  categories: Category[];
  products: ProductWithRelations[];
  addons: Addon[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [heldOrderId, setHeldOrderId] = useState<string | null>(null);

  const getProduct = (id: string) => products.find((p) => p.id === id);
  const getVariant = (productId: string, variantId: string) => {
    return getProduct(productId)?.variants.find((v) => v.id === variantId);
  };
  const getAddon = (id: string) => addons.find((a) => a.id === id);

  const addToCart = (item: Omit<CartItem, "id">) => {
    setCart((prev) => {
      // Check if identical item exists (same product, variant, addons, notes)
      const existingIndex = prev.findIndex((i) => 
        i.productId === item.productId &&
        i.variantId === item.variantId &&
        i.notes === item.notes &&
        JSON.stringify([...i.addons].sort()) === JSON.stringify([...item.addons].sort())
      );

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex]!.quantity += item.quantity;
        return newCart;
      }

      return [...prev, { ...item, id: Math.random().toString(36).substr(2, 9) }];
    });
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setHeldOrderId(null);
  };

  const { cartSubtotal, cartTotal } = useMemo(() => {
    let subtotal = 0;
    for (const item of cart) {
      const product = getProduct(item.productId);
      if (!product) continue;
      
      let unitPrice = product.price;
      if (item.variantId) {
        const variant = getVariant(item.productId, item.variantId);
        if (variant) unitPrice = variant.price;
      }
      
      let addonsPrice = 0;
      for (const addonId of item.addons) {
        const addon = getAddon(addonId);
        if (addon) addonsPrice += addon.price;
      }
      
      subtotal += (unitPrice + addonsPrice) * item.quantity;
    }
    return { cartSubtotal: subtotal, cartTotal: subtotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, products, addons]);

  return (
    <PosContext.Provider
      value={{
        categories,
        products,
        addons,
        cart,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        cartTotal,
        cartSubtotal,
        getProduct,
        getVariant,
        getAddon,
        heldOrderId,
        setHeldOrderId,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error("usePos must be used within a PosProvider");
  }
  return context;
}
