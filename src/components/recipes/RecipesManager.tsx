"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatQuantity } from "@/lib/inventory/unit-conversion";

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface IngredientOption {
  id: string;
  name: string;
  cost?: number | null;
  unit: Unit;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  variants?: ProductVariant[];
}

interface RecipeItem {
  id?: string;
  quantity: number;
  ingredient: {
    id: string;
    name: string;
    cost?: number | null;
    unit: Unit;
  };
}

interface Recipe {
  id: string;
  name: string;
  productId: string;
  variantId: string | null;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    price: number;
  };
  variant: {
    id: string;
    name: string;
    price: number;
  } | null;
  items: RecipeItem[];
  hpp: number;
}

interface ItemRow {
  ingredientId: string;
  quantity: string;
}

export function RecipesManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [allIngredients, setAllIngredients] = useState<IngredientOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [recipeName, setRecipeName] = useState("");
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadRecipes() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const data = await apiRequest<{ items: Recipe[]; total: number }>(`/api/recipes?${params}`);
      setRecipes(data.items);
      setTotal(data.total);
    } catch (err) {
      setErrorMessage((err as ApiClientError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  async function openCreateModal() {
    setFormError(null);
    setSelectedProductId("");
    setSelectedVariantId("");
    setRecipeName("");
    setItemRows([]);
    setModalOpen(true);

    try {
      const [prodRes, ingRes] = await Promise.all([
        apiRequest<{ items: ProductOption[] }>("/api/products?pageSize=100"),
        apiRequest<{ items: IngredientOption[] }>("/api/ingredients?pageSize=100&status=active"),
      ]);
      setProducts(prodRes.items);
      setAllIngredients(ingRes.items);

      if (prodRes.items.length > 0 && prodRes.items[0]) {
        const firstProduct = prodRes.items[0];
        setSelectedProductId(firstProduct.id);
        handleProductChange(firstProduct.id, prodRes.items, ingRes.items);
      }
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleProductChange(
    prodId: string,
    prodList = products,
    ingList = allIngredients
  ) {
    setSelectedProductId(prodId);
    setSelectedVariantId("");
    const prod = prodList.find((p) => p.id === prodId);

    // Fetch full product details with variants if needed
    try {
      const fullProd = await apiRequest<{ product: ProductOption }>(`/api/products/${prodId}`);
      // update products state with variants
      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, variants: fullProd.product.variants } : p))
      );
      setRecipeName(`Resep ${fullProd.product.name}`);
    } catch {
      setRecipeName(prod ? `Resep ${prod.name}` : "");
    }

    if (itemRows.length === 0 && ingList.length > 0 && ingList[0]) {
      setItemRows([{ ingredientId: ingList[0].id, quantity: "1" }]);
    }
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants?.find((v) => v.id === variantId);
    if (prod) {
      setRecipeName(variant ? `Resep ${prod.name} (${variant.name})` : `Resep ${prod.name}`);
    }
  }

  function addItemRow() {
    if (allIngredients.length === 0 || !allIngredients[0]) return;
    setItemRows([...itemRows, { ingredientId: allIngredients[0].id, quantity: "1" }]);
  }

  function removeItemRow(index: number) {
    setItemRows(itemRows.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, field: keyof ItemRow, value: string) {
    setItemRows(
      itemRows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  // Calculate live preview HPP
  const currentCalculatedHpp = itemRows.reduce((sum, row) => {
    const ing = allIngredients.find((i) => i.id === row.ingredientId);
    const cost = ing?.cost ?? 0;
    const qty = parseFloat(row.quantity) || 0;
    return sum + qty * cost;
  }, 0);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants?.find((v) => v.id === selectedVariantId);
  const targetPrice = selectedVariant ? selectedVariant.price : selectedProduct?.price ?? 0;

  async function handleCreateSubmit() {
    setFormError(null);
    if (!selectedProductId) {
      setFormError("Pilih produk untuk resep ini.");
      return;
    }
    if (!recipeName.trim()) {
      setFormError("Nama resep wajib diisi.");
      return;
    }
    if (itemRows.length === 0) {
      setFormError("Minimal harus menambahkan 1 bahan baku.");
      return;
    }

    for (const row of itemRows) {
      const q = parseFloat(row.quantity);
      if (isNaN(q) || q <= 0) {
        setFormError("Jumlah setiap bahan baku harus lebih besar dari 0.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/recipes", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProductId,
          variantId: selectedVariantId || null,
          name: recipeName.trim(),
          items: itemRows.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: parseFloat(r.quantity),
          })),
        }),
      });

      showToast("Resep berhasil dibuat.");
      setModalOpen(false);
      loadRecipes();
    } catch (err) {
      const apiErr = err as ApiClientError;
      setFormError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Cari resep atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        {canManage && (
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Resep
          </Button>
        )}
      </div>

      {loading && <LoadingState label="Memuat resep..." />}
      {errorMessage && (
        <ErrorState title="Gagal memuat resep" message={errorMessage} onRetry={loadRecipes} />
      )}
      {!loading && !errorMessage && recipes.length === 0 && (
        <EmptyState
          title="Belum ada resep."
          description="Tambahkan resep untuk memetakan bahan baku produk dan menghitung HPP otomatis."
          action={
            canManage ? (
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Resep
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !errorMessage && recipes.length > 0 && (
        <>
          <div className="overflow-x-auto rounded border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-ink-subtle">
                  <th className="px-4 py-3 font-medium">Nama Resep</th>
                  <th className="px-4 py-3 font-medium">Produk & Varian</th>
                  <th className="px-4 py-3 font-medium">Jumlah Bahan</th>
                  <th className="px-4 py-3 font-medium">Estimasi HPP</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr key={recipe.id} className="border-b border-border last:border-0 hover:bg-surface-muted/30">
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link href={`/recipes/${recipe.id}`} className="hover:text-coffee-600 hover:underline">
                        {recipe.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <span>{recipe.product.name}</span>
                      {recipe.variant && (
                        <span className="ml-1.5 rounded bg-coffee-100 px-1.5 py-0.5 text-xs font-medium text-coffee-800">
                          {recipe.variant.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {recipe.items.length} bahan
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      Rp {recipe.hpp.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={recipe.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="text-sm font-medium text-coffee-600 hover:underline"
                      >
                        Detail & Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Resep Produk" widthClassName="max-w-2xl">
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="rounded bg-danger-50 p-3 text-sm text-danger border border-danger-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Pilih Produk"
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={submitting}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Rp {p.price.toLocaleString("id-ID")})
                </option>
              ))}
            </Select>

            {selectedProduct?.variants && selectedProduct.variants.length > 0 ? (
              <Select
                label="Varian (Opsional)"
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                disabled={submitting}
              >
                <option value="">Semua Varian / Base</option>
                {selectedProduct.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Rp {v.price.toLocaleString("id-ID")})
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-col justify-center">
                <span className="text-xs text-ink-subtle">Varian</span>
                <span className="mt-1 text-sm text-ink-muted">Produk tunggal (tanpa varian)</span>
              </div>
            )}
          </div>

          <Input
            label="Nama Resep"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Contoh: Resep Latte Regular"
            disabled={submitting}
            required
          />

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-ink">Bahan Baku & Takaran Per Porsi</label>
              <Button type="button" variant="secondary" size="sm" onClick={addItemRow} disabled={submitting}>
                <Plus className="h-3.5 w-3.5" /> Tambah Bahan
              </Button>
            </div>

            {itemRows.length === 0 ? (
              <p className="py-3 text-center text-sm text-ink-subtle">
                Belum ada bahan baku ditambahkan. Klik tombol di atas untuk menambah bahan.
              </p>
            ) : (
              <div className="space-y-3">
                {itemRows.map((row, idx) => {
                  const selectedIng = allIngredients.find((i) => i.id === row.ingredientId);
                  const lineCost = (parseFloat(row.quantity) || 0) * (selectedIng?.cost ?? 0);

                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded border border-border bg-surface-muted/20 p-2.5"
                    >
                      <div className="min-w-[180px] flex-1">
                        <label className="mb-1 block text-xs text-ink-subtle">Bahan Baku</label>
                        <Select
                          value={row.ingredientId}
                          onChange={(e) => updateItemRow(idx, "ingredientId", e.target.value)}
                          disabled={submitting}
                        >
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit.symbol})
                              {ing.cost != null ? ` - Rp ${ing.cost.toLocaleString("id-ID")}/${ing.unit.symbol}` : " - Biaya belum diisi"}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="w-28">
                        <label className="mb-1 block text-xs text-ink-subtle">
                          Jumlah ({selectedIng?.unit.symbol || "satuan"})
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min={0.0001}
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                          disabled={submitting}
                          placeholder="Takaran"
                        />
                      </div>

                      <div className="w-28 pb-2 text-right text-xs">
                        <span className="text-ink-subtle">Biaya Takaran:</span>
                        <div className="font-medium text-ink">
                          Rp {Math.round(lineCost).toLocaleString("id-ID")}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={submitting || itemRows.length <= 1}
                        className="rounded p-2 text-ink-subtle hover:bg-danger-50 hover:text-danger disabled:opacity-30"
                        title="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HPP Live Summary */}
          <div className="rounded border border-coffee-200 bg-coffee-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-coffee-900">Total HPP per Porsi:</span>
                <p className="text-xs text-coffee-700">
                  Σ (takaran × biaya bahan baku)
                </p>
              </div>
              <span className="text-xl font-bold text-coffee-900">
                Rp {Math.round(currentCalculatedHpp).toLocaleString("id-ID")}
              </span>
            </div>

            {targetPrice > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-coffee-200 pt-2 text-xs text-coffee-800">
                <span>Harga Jual: Rp {targetPrice.toLocaleString("id-ID")}</span>
                <span>
                  Estimasi Margin:{" "}
                  <strong>
                    Rp {(targetPrice - currentCalculatedHpp).toLocaleString("id-ID")}{" "}
                    ({Math.round(((targetPrice - currentCalculatedHpp) / targetPrice) * 100)}%)
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button size="sm" onClick={handleCreateSubmit} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan Resep"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
