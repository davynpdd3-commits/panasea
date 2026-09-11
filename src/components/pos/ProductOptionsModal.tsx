"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { usePos, type ProductWithRelations } from "./PosContext";
import { Textarea } from "@/components/ui/textarea";

interface ProductOptionsModalProps {
  product: ProductWithRelations;
  onClose: () => void;
}

export function ProductOptionsModal({ product, onClose }: ProductOptionsModalProps) {
  const { addToCart } = usePos();
  
  // State for selections
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants.length > 0 ? product.variants[0]?.id : undefined
  );
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const toggleAddon = (addonId: string) => {
    const next = new Set(selectedAddons);
    if (next.has(addonId)) {
      next.delete(addonId);
    } else {
      next.add(addonId);
    }
    setSelectedAddons(next);
  };

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      variantId: selectedVariantId,
      addons: Array.from(selectedAddons),
      quantity,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  // Calculate current total
  const basePrice = selectedVariantId 
    ? product.variants.find((v) => v.id === selectedVariantId)?.price || 0
    : product.price;
  
  const addonsPrice = Array.from(selectedAddons).reduce((acc, addonId) => {
    const addon = product.addons.find((a) => a.addonId === addonId)?.addon;
    return acc + (addon?.price || 0);
  }, 0);

  const total = (basePrice + addonsPrice) * quantity;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={product.name}
    >
      <div className="space-y-6">
        {product.variants.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-ink mb-3">Varian</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`flex flex-col items-start p-3 rounded-lg border transition-all ${
                    selectedVariantId === v.id
                      ? "border-coffee-600 bg-coffee-50 ring-1 ring-coffee-600"
                      : "border-border bg-surface hover:border-coffee-300 hover:bg-cream"
                  }`}
                >
                  <span className="text-sm font-medium text-ink">{v.name}</span>
                  <span className="text-xs text-ink-muted mt-1">{formatRupiah(v.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {product.addons.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-ink mb-3">Tambahan (Add-on)</h4>
            <div className="space-y-2">
              {product.addons.map((pa) => {
                const isSelected = selectedAddons.has(pa.addonId);
                return (
                  <button
                    key={pa.addonId}
                    onClick={() => toggleAddon(pa.addonId)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-coffee-600 bg-coffee-50"
                        : "border-border bg-surface hover:border-coffee-300 hover:bg-cream"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                        isSelected ? "bg-coffee-600 border-coffee-600 text-white" : "border-ink-muted/30"
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-ink">{pa.addon.name}</span>
                    </div>
                    <span className="text-sm text-ink-muted">+{formatRupiah(pa.addon.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-ink mb-3">Catatan (Opsional)</h4>
          <Textarea 
            placeholder="Contoh: Kurangi gula, ekstra panas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full bg-cream border border-border flex items-center justify-center text-ink hover:bg-surface disabled:opacity-50"
              disabled={quantity <= 1}
            >
              &minus;
            </button>
            <span className="font-medium w-4 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-cream border border-border flex items-center justify-center text-ink hover:bg-surface"
            >
              +
            </button>
          </div>
          
          <Button onClick={handleAdd} className="min-w-[140px]">
            Tambah &bull; {formatRupiah(total)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
